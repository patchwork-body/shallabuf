import { describe, it, expect, vi } from "vitest";
import { Channel } from "./channel";
import * as Y from "yjs";

const createInitPatch = (state: Record<string, unknown>) => {
  const initDoc = new Y.Doc();
  const root = initDoc.getMap("root");
  const stateMap = new Y.Map();

  Object.entries(state).forEach(([key, value]) => {
    if (typeof value === "object" && value !== null) {
      const nestedMap = new Y.Map();

      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        nestedMap.set(nestedKey, nestedValue);
      });

      stateMap.set(key, nestedMap);
    } else if (Array.isArray(value)) {
      const nestedArray = new Y.Array();

      value.forEach((nestedValue) => {
        nestedArray.push(nestedValue);
      });

      stateMap.set(key, nestedArray);
    } else {
      stateMap.set(key, value);
    }
  });

  root.set("state", stateMap);

  return Y.encodeStateAsUpdateV2(initDoc);
};

describe("Channel", () => {
  it("should create a channel with initial state placeholder", () => {
    const doc = new Y.Doc();
    const placeholder = { count: 0 };
    const channel = new Channel("test-channel", doc, placeholder);

    expect(channel.channelId).toBe("test-channel");
    expect(channel.state.count).toBe(0);
  });

  it("should update state after init patch", () => {
    const doc = new Y.Doc();
    const placeholder = { count: 0 };
    const channel = new Channel("test-channel", doc, placeholder);

    const patch = createInitPatch({ count: 0 });
    channel.applyInitPatch(patch);

    channel.state.count = 42;
    expect(channel.state.count).toBe(42);
  });

  it("should not apply init patch if channel is already initialized", () => {
    const doc = new Y.Doc();
    const placeholder = { count: 0 };
    const channel = new Channel("test-channel", doc, placeholder);

    const patch = createInitPatch({ count: 0 });
    channel.applyInitPatch(patch);

    channel.state.count = 42;
    expect(channel.state.count).toBe(42);

    channel.applyInitPatch(patch);
    expect(channel.state.count).toBe(42);
  });

  it("should allow nested state modifications", () => {
    const doc = new Y.Doc();
    const placeholder = { count: 0, nested: { value: 0 } };
    const channel = new Channel("test-channel", doc, placeholder);

    const patch = createInitPatch({ count: 0, nested: { value: 0 } });
    channel.applyInitPatch(patch);

    channel.state.nested.value = 42;
    expect(channel.state.nested.value).toBe(42);

    channel.state.count = 100;
    expect(channel.state.count).toBe(100);
    expect(channel.state.nested.value).toBe(42);
  });

  describe("watchState", () => {
    it("should call callback with initial state and when state changes", () => {
      const doc = new Y.Doc();
      const placeholder = { count: 0 };
      const channel = new Channel("test-channel", doc, placeholder);

      const patch = createInitPatch({ count: 0 });
      channel.applyInitPatch(patch);

      const callback = vi.fn();
      channel.watchState(callback);

      expect(callback).toHaveBeenCalledWith({ count: 0 }); // Initial state

      channel.state.count = 42;
      expect(callback).toHaveBeenCalledWith({ count: 42 }); // Updated state
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should call callback with selected field for initial and updated values", () => {
      const doc = new Y.Doc();
      const placeholder = { count: 0, name: "initial" };
      const channel = new Channel("test-channel", doc, placeholder);

      const patch = createInitPatch({ count: 0, name: "initial" });
      channel.applyInitPatch(patch);

      const callback = vi.fn();
      channel.watchState(callback, (state) => state.count);
      expect(callback).toHaveBeenCalledWith(0); // Initial value

      channel.state.count = 42;
      channel.state.name = "updated";

      expect(callback).toHaveBeenCalledWith(42); // Updated value
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).not.toHaveBeenCalledWith("updated");
    });

    it("should allow unsubscribing from state changes", () => {
      const doc = new Y.Doc();
      const placeholder = { count: 0 };
      const channel = new Channel("test-channel", doc, placeholder);

      const patch = createInitPatch({ count: 0 });
      channel.applyInitPatch(patch);

      const callback = vi.fn();
      const unsubscribe = channel.watchState(callback);

      expect(callback).toHaveBeenCalledWith({ count: 0 }); // Initial state
      channel.state.count = 42;
      expect(callback).toHaveBeenCalledWith({ count: 42 }); // Updated state

      unsubscribe();
      channel.state.count = 100;
      expect(callback).toHaveBeenCalledTimes(2); // Only initial and first update
    });

    it("should handle multiple watchers", () => {
      const doc = new Y.Doc();
      const placeholder = { count: 0, name: "initial" };
      const channel = new Channel("test-channel", doc, placeholder);

      const patch = createInitPatch({ count: 0, name: "initial" });
      channel.applyInitPatch(patch);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Set up watchers
      channel.watchState(callback1);
      expect(callback1).toHaveBeenCalledWith({ count: 0, name: "initial" }); // Initial state for first watcher

      channel.watchState(callback2, (state) => state.count);
      expect(callback2).toHaveBeenCalledWith(0); // Initial state for second watcher

      // Update state
      channel.state.count = 42;
      expect(callback1).toHaveBeenCalledWith({ count: 42, name: "initial" }); // Full state update
      expect(callback2).toHaveBeenCalledWith(42); // Count update only
      channel.state.name = "updated";

      expect(callback1).toHaveBeenCalledWith({ count: 42, name: "updated" }); // Full state update
      expect(callback2).not.toHaveBeenCalledWith("updated"); // No update for count watcher

      // Verify total number of calls
      expect(callback1).toHaveBeenCalledTimes(3); // Initial + count update + name update
      expect(callback2).toHaveBeenCalledTimes(2); // Initial + count update
    });

    it("should handle nested state modifications", () => {
      const doc = new Y.Doc();
      const placeholder = { count: 0, nested: { value: 0 } };
      const channel = new Channel("test-channel", doc, placeholder);

      const patch = createInitPatch({ count: 0, nested: { value: 0 } });
      channel.applyInitPatch(patch);

      const callback = vi.fn();
      channel.watchState(callback, (state) => state.nested.value);

      expect(callback).toHaveBeenCalledWith(0); // Initial value

      channel.state.nested = { value: 42 };
      expect(callback).toHaveBeenCalledWith(42);
      expect(callback).toHaveBeenCalledTimes(2);

      channel.state.nested.value = 45;
      expect(channel.state.nested.value).toBe(45);
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(45); // Updated value

      channel.state.count = 100;
      expect(channel.state.count).toBe(100);
      expect(channel.state.nested.value).toBe(45);
      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith(45); // Only nested value changed
    });
  });
});
