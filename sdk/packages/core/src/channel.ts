import * as Y from "yjs";

type Watcher<T extends Record<string, unknown>, R = T> = {
  callback: (state: R) => void;
  selector?: (state: T) => R;
  lastValue?: R;
};

export class Channel<
  T extends Record<string, unknown>,
  M extends Record<string, unknown>
> {
  userId?: string;
  public channelId: string;
  public doc: Y.Doc;
  private placeholder: T;
  private stateWatchers: Set<Watcher<T, any>> = new Set();
  private membersWatchers: Set<Watcher<Record<string, M>, any>> = new Set();
  private initialized = false;

  constructor(channelId: string, doc: Y.Doc, placeholder: T, userId?: string) {
    this.channelId = channelId;
    this.doc = doc;
    this.placeholder = placeholder;
    this.userId = userId;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  watchState<R>(
    callback: (state: R) => void,
    selector?: (state: T) => R
  ): () => void {
    const watcher = { callback, selector } as Watcher<T, R>;

    // Compute initial value
    const currentState = this.state;
    const selected = selector ? selector(currentState) : (currentState as unknown as R);
    watcher.lastValue = selected;
    callback(selected);

    this.stateWatchers.add(watcher);

    return () => this.stateWatchers.delete(watcher);
  }

  watchMembers<R>(
    callback: (members: R) => void,
    selector?: (members: Record<string, M>) => R
  ): () => void {
    const watcher = { callback, selector } as Watcher<Record<string, M>, R>;

    // Compute initial value
    const currentMembers = this.members;
    const selected = selector ? selector(currentMembers) : (currentMembers as unknown as R);
    watcher.lastValue = selected;
    callback(selected);

    this.membersWatchers.add(watcher);

    return () => this.membersWatchers.delete(watcher);
  }

  private notifyStateWatcher<R>(watcher: Watcher<T, R>) {
    const currentState = this.state;
    const selected = watcher.selector ? watcher.selector(currentState) : (currentState as unknown as R);

    if (watcher.lastValue !== selected) {
      watcher.lastValue = selected;
      watcher.callback(selected);
    }
  }

  private notifyMembersWatcher<R>(watcher: Watcher<Record<string, M>, R>) {
    const currentMembers = this.members;
    const selected = watcher.selector ? watcher.selector(currentMembers) : (currentMembers as unknown as R);

    if (watcher.lastValue !== selected) {
      watcher.lastValue = selected;
      watcher.callback(selected);
    }
  }

  get rawDoc(): Y.Doc {
    return this.doc;
  }

  encodeStateAsUpdate() {
    return Y.encodeStateAsUpdateV2(this.doc);
  }

  applyPatch(patch: Uint8Array) {
    try {
      this.doc.transact(() => {
        // Ensure the patch is a valid Uint8Array
        if (!(patch instanceof Uint8Array)) {
          console.error("Invalid patch format: expected Uint8Array");
          return;
        }

        // Validate patch size
        if (patch.length > 1024 * 1024) {
          // 1MB limit
          console.error("Patch too large:", patch.length);
          return;
        }

        Y.applyUpdateV2(this.doc, patch);
      });
    } catch (error) {
      console.error("Error applying patch:", error);
    }
  }

  applyInitPatch(patch: Uint8Array) {
    if (this.initialized) {
      return;
    }

    this.applyPatch(patch);

    const root = this.doc.getMap("root");
    const stateMap = root.get("state") as Y.Map<T> | undefined;

    if (!stateMap) {
      return;
    }

    stateMap.observeDeep(() => {
      for (const watcher of this.stateWatchers) {
        this.notifyStateWatcher(watcher);
      }
    });

    const membersMap = root.get("members") as Y.Map<M> | undefined;

    if (!membersMap) {
      return;
    }

    membersMap.observeDeep(() => {
      for (const watcher of this.membersWatchers) {
        this.notifyMembersWatcher(watcher);
      }
    });

    this.initialized = true;
  }

  /**
   * Recursively wraps Yjs values (Y.Map, Y.Array) in Proxies for mutable access.
   */
  private wrapYValue(yValue: Y.Map<any> | Y.Array<any>): any {
    if (yValue instanceof Y.Map) {
      return new Proxy(yValue, {
        get: (target, prop) => {
          if (typeof prop === "string" && target.has(prop)) {
            const value = target.get(prop);

            // Recursively wrap Y.Map or Y.Array
            if (value instanceof Y.Map || value instanceof Y.Array) {
              return this.wrapYValue(value);
            }

            return value;
          }

          if (prop === "toJSON") {
            return () => target.toJSON();
          }

          return target[prop as keyof Y.Map<any>];
        },

        set: (target, prop, value) => {
          this.doc.transact(() => {
            // If assigning a plain object, convert to Y.Map
            if (value && typeof value === "object" && !(value instanceof Y.Map) && !(value instanceof Y.Array)) {
              if (Array.isArray(value)) {
                const yArr = new Y.Array();
                yArr.push(value);
                target.set(prop as string, yArr);
              } else {
                const yMap = new Y.Map();

                for (const [k, v] of Object.entries(value)) {
                  yMap.set(k, v);
                }

                target.set(prop as string, yMap);
              }
            } else {
              target.set(prop as string, value);
            }
          });

          return true;
        },

        ownKeys: (target) => Array.from(target.keys()),
        getOwnPropertyDescriptor: () => ({
          enumerable: true,
          configurable: true,
        }),
      });
    } else if (yValue instanceof Y.Array) {
      return new Proxy(yValue, {
        get: (target, prop) => {
          if (typeof prop === "string" && !isNaN(Number(prop))) {
            const value = target.get(Number(prop));

            if (value instanceof Y.Map || value instanceof Y.Array) {
              return this.wrapYValue(value);
            }

            return value;
          }

          if (prop === "toJSON") {
            return () => target.toJSON();
          }

          return target[prop as keyof Y.Array<any>];
        },

        set: (target, prop, value) => {
          if (typeof prop === "string" && !isNaN(Number(prop))) {
            this.doc.transact(() => {
              target.delete(Number(prop), 1);
              target.insert(Number(prop), [value]);
            });

            return true;
          }

          return false;
        },

        ownKeys: (target) => Array.from({ length: target.length }, (_, i) => i.toString()),
        getOwnPropertyDescriptor: () => ({
          enumerable: true,
          configurable: true,
        }),
      });
    }

    return yValue;
  }

  /**
   * Returns a Proxy to the Yjs state, allowing direct get/set and mutation operations.
   */
  get state(): T {
    const root = this.doc.getMap("root");
    let state = root.get("state") as Y.Map<T> | undefined;

    if (state) {
      return this.wrapYValue(state);
    }

    return this.placeholder;
  }

  /**
   * Returns a Proxy to the members map, allowing direct get/set and mutation operations.
   */
  get members(): Record<string, M> {
    const root = this.doc.getMap("root");
    let members = root.get("members") as Y.Map<M> | undefined;

    if (members) {
      return this.wrapYValue(members);
    }

    return {} as Record<string, M>;
  }
}
