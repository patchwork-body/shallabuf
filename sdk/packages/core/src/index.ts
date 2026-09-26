import * as Y from "yjs";
import { Channel } from "./channel";

export type State<T extends Record<string, unknown>> = {
  state: T;
}

export interface ShallabufConfig {
  authUrl?: string;
  refreshUrl?: string;
  authMethod?: "GET" | "POST" | "PUT";
  headers?: Record<string, string>;
  wsUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  userId?: string;
}

export interface IWebSocketHandler {
  onError: (event: Event) => void;
  onClose: (event: CloseEvent) => void;
  onOpen: (event: Event) => void;
}

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

export interface ChannelInitPayload {
  channelId: string;
  initState?: Record<string, unknown>;
}

export class ShallabufClient {
  private config: ShallabufConfig;
  private authorized: boolean = false;
  private initialized: boolean = false;
  private jwt: string | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private state: ConnectionState = "disconnected";
  private messageQueue: any[] = [];
  private wsHandler: IWebSocketHandler;
  public userId: string | null | undefined = undefined;
  public channels: Map<string, Channel<any, any>> = new Map();
  private pendingChannels: Map<
    string,
    { resolve: (channel: Channel<any, any>) => void; reject: (error: Error) => void }
  > = new Map();

  constructor(config: ShallabufConfig = {}, wsHandler: IWebSocketHandler) {
    this.config = {
      authUrl: config.authUrl ?? "/api/shallabuf/jwt/issue",
      refreshUrl: config.refreshUrl ?? "/api/shallabuf/jwt/refresh",
      authMethod: config.authMethod ?? "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...config.headers,
      },
      wsUrl: config.wsUrl ?? "wss://shallabuf-platform.fly.dev",
      reconnectInterval: config.reconnectInterval ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      userId: config.userId,
    };

    this.wsHandler = wsHandler;
  }

  async init<T extends Record<string, unknown>>(
    initPayload: T = {} as T
  ): Promise<ShallabufClient> {
    const response = await this.getJwt(initPayload);
    this.jwt = response.accessToken;

    // Extract user ID from JWT claims
    const [_, jwtPayload] = response.accessToken.split(".");

    if (jwtPayload) {
      const claims = JSON.parse(atob(jwtPayload));
      this.userId = claims.sub;

      this.channels.forEach((channel) => {
        channel.setUserId(this.userId!);
      });
    }

    this.authorized = true;
    await this.connect();

    return this;
  }

  private async connect(): Promise<void> {
    if (this.state === "connecting" || this.state === "connected") {
      return;
    }

    if (!this.jwt) {
      throw new Error("JWT not found, please call init() first");
    }

    this.state = "connecting";
    this.ws = this.createWebSocket(this.jwt);

    // Wait for connection to be established
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 5000);

      if (!this.ws) {
        throw new Error("Failed to create WebSocket");
      }

      this.ws.addEventListener("open", () => {
        clearTimeout(timeout);

        this.state = "connected";
        this.reconnectAttempts = 0;
        this.processMessageQueue();

        resolve();
      });

      this.ws.addEventListener("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.state === "connected") {
      const message = this.messageQueue.shift();

      if (message) {
        this.send(message);
      }
    }
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      throw new Error("Max reconnection attempts reached");
    }

    this.state = "reconnecting";
    this.reconnectAttempts++;

    try {
      await this.connect();
    } catch (error) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnect();
      }, this.config.reconnectInterval);

      throw error;
    }
  }

  private send(message: any): void {
    if (this.state !== "connected" || !this.ws || !this.authorized) {
      this.messageQueue.push(message);
      return;
    }

    // Message type (0 for patch, 1 for other messages)
    const typeByte = new Uint8Array([message.type === "patch" ? 0 : 1]);

    // Channel ID
    const channelIdBytes = new TextEncoder().encode(message.channelId);
    const channelIdLength = new Uint8Array(4);
    new DataView(channelIdLength.buffer).setUint32(
      0,
      channelIdBytes.length,
      true
    );

    // Message data
    const dataBytes =
      message.type === "patch" ? message.delta : message.initState;

    // Combine all parts
    const buffer = new Uint8Array(
      1 + 4 + channelIdBytes.length + dataBytes.length
    );

    buffer.set(typeByte, 0);
    buffer.set(channelIdLength, 1);
    buffer.set(channelIdBytes, 5);
    buffer.set(dataBytes, 5 + channelIdBytes.length);

    this.ws.send(buffer);
  }

  private close(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = "disconnected";
    this.messageQueue = [];
  }

  private async getJwt<
    T extends Record<string, unknown>,
    R extends Record<string, unknown> = { accessToken: string }
  >(payload: T = {} as T): Promise<R> {
    // Try to refresh token first if we're not explicitly requesting a new token
    try {
      const refreshResponse = await fetch(this.config.refreshUrl!, {
        method: "POST",
        headers: this.config.headers,
        credentials: "include",
      });

      if (refreshResponse.ok) {
        return refreshResponse.json();
      }
    } catch (error) {
      console.debug("Failed to refresh token, will request new one:", error);
    }

    // If refresh failed or we're explicitly requesting a new token
    const response = await fetch(this.config.authUrl!, {
      method: this.config.authMethod,
      headers: this.config.headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Authentication failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  private createWebSocket(token: string): WebSocket {
    const url = new URL(this.config.wsUrl!);
    url.searchParams.set("token", token);
    const ws = new WebSocket(url.toString());

    ws.addEventListener("message", async (event: MessageEvent) => {
      try {
        if (event.data instanceof Blob) {
          // Handle binary message
          const arrayBuffer = await event.data.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Validate minimum message length (1 byte type + 4 bytes length)
          if (uint8Array.length < 5) {
            throw new Error("Invalid message format: message too short");
          }

          // First byte is message type
          const messageType = uint8Array[0];
          if (messageType !== 0 && messageType !== 1) {
            throw new Error(`Invalid message type: ${messageType}`);
          }

          // Next 4 bytes contain the channel_id length
          const channelIdLength = new DataView(arrayBuffer).getUint32(1, true);

          // Validate channel ID length
          if (channelIdLength === 0 || channelIdLength > 1024) {
            throw new Error(`Invalid channel ID length: ${channelIdLength}`);
          }

          // Validate total message length
          if (uint8Array.length < 5 + channelIdLength) {
            throw new Error(
              "Invalid message format: message too short for channel ID"
            );
          }

          const channelIdBytes = uint8Array.slice(5, 5 + channelIdLength);
          const channelId = new TextDecoder().decode(channelIdBytes);

          // The rest is the message data
          const data = uint8Array.slice(5 + channelIdLength);

          if (messageType === 0) {
            // Handle Yjs patch
            const channel = this.channels.get(channelId);

            if (channel) {
              try {
                channel.applyPatch(data);
              } catch (patchError) {
                console.error(
                  `Error applying patch to channel ${channelId}:`,
                  patchError
                );

                throw patchError; // Re-throw to be caught by outer try-catch
              }
            } else {
              console.error(`Channel ${channelId} not found for patch`);
            }
          } else if (messageType === 1) {
            const channel = this.channels.get(channelId);
            const pending = this.pendingChannels.get(channelId);

            if (!channel) {
              console.error(`Channel ${channelId} not found`);
              return;
            }

            try {
              channel.applyInitPatch(data);
            } catch (initError: unknown) {
              console.error(
                `Error applying init update to channel ${channelId}:`,
                initError
              );

              if (pending) {
                pending.reject(
                  initError instanceof Error
                    ? initError
                    : new Error(String(initError))
                );

                this.pendingChannels.delete(channelId);
              }

              throw initError; // Re-throw to be caught by outer try-catch
            }

            if (pending) {
              pending.resolve(channel);
              this.pendingChannels.delete(channelId);
            }

            this.initialized = true;
          }
        } else {
          console.warn("Received non-binary message, this should not happen");
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        // Consider implementing reconnection logic here if needed
      }
    });

    ws.addEventListener("error", this.wsHandler.onError);
    ws.addEventListener("close", this.wsHandler.onClose);
    ws.addEventListener("open", this.wsHandler.onOpen);

    return ws;
  }

  async initChannel<T extends Record<string, unknown>, M extends Record<string, unknown>>(
    payload: ChannelInitPayload
  ): Promise<Channel<T, M>> {
    if (!this.channels.has(payload.channelId)) {
      const doc = new Y.Doc();

      const patchBatchMap: WeakMap<Y.Doc, { patches: Uint8Array[]; debounceTimer: ReturnType<typeof setTimeout> | null; maxWaitTimer: ReturnType<typeof setTimeout> | null }> =
        (this as any)._patchBatchMap || new WeakMap();
      (this as any)._patchBatchMap = patchBatchMap;

      patchBatchMap.set(doc, { patches: [], debounceTimer: null, maxWaitTimer: null });

      const sendBatch = () => {
        const batchState = patchBatchMap.get(doc);
        if (!batchState || batchState.patches.length === 0) return;

        // Merge all patches
        const merged = Y.mergeUpdatesV2(batchState.patches);

        this.send({
          type: "patch",
          channelId: payload.channelId,
          delta: merged,
        });

        batchState.patches = [];

        if (batchState.debounceTimer) {
          clearTimeout(batchState.debounceTimer);
          batchState.debounceTimer = null;
        }

        if (batchState.maxWaitTimer) {
          clearTimeout(batchState.maxWaitTimer);
          batchState.maxWaitTimer = null;
        }
      };

      doc.on("updateV2", (update) => {
        if (!this.initialized) {
          return;
        }

        const batchState = patchBatchMap.get(doc);
        if (!batchState) return;

        batchState.patches.push(update);

        // Debounce timer (50ms)
        if (batchState.debounceTimer) {
          clearTimeout(batchState.debounceTimer);
        }

        batchState.debounceTimer = setTimeout(sendBatch, 50);

        // Max-wait timer (500ms)
        if (!batchState.maxWaitTimer) {
          batchState.maxWaitTimer = setTimeout(sendBatch, 500);
        }
      });

      const channel = new Channel<T, M>(
        payload.channelId,
        doc,
        payload.initState as T,
        this.userId!
      );

      this.channels.set(payload.channelId, channel);

      // Convert initState to binary data if provided
      const initState = payload.initState
        ? new TextEncoder().encode(JSON.stringify(payload.initState))
        : new Uint8Array(0);

      this.send({
        type: "init",
        channelId: payload.channelId,
        initState,
      });

      return new Promise<Channel<T, M>>((resolve, reject) => {
        this.pendingChannels.set(payload.channelId, { resolve, reject });
      });
    }

    return this.channels.get(payload.channelId) as Channel<T, M>;
  }
}

export { Channel };
