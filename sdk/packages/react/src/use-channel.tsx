import { RefObject, useCallback, useRef, useState } from "react";
import { useEffect } from "react";
import { useShallabufClient } from "./shallabuf-inner";
import { Channel, ChannelInitPayload } from "@shallabuf-sdk/core";

export type ChannelResult<T extends Record<string, unknown>, M extends Record<string, unknown>> =
  | {
      loading: false;
      channel: RefObject<Channel<T, M>>;
    }
  | {
      loading: true;
    };

export const useChannel = <T extends Record<string, unknown>, M extends Record<string, unknown>>(
  payload: ChannelInitPayload
): ChannelResult<T, M> => {
  const { client, connectionState } = useShallabufClient();
  const channel = useRef<Channel<T, M> | null>(null);
  const [loading, setLoading] = useState(true);

  const initChannel = useCallback(async () => {
    if (!client?.initChannel) {
      return;
    }

    setLoading(true);
    const newChannel = await client.initChannel<T, M>(payload);
    channel.current = newChannel;
    setLoading(false);
  }, [connectionState]);

  useEffect(() => {
    initChannel();
  }, [initChannel]);

  return {
    loading,
    channel: channel as unknown as RefObject<Channel<T, M>>,
  };
};
