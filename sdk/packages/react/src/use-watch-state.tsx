import { useEffect, useRef, useState } from "react";
import { ChannelResult } from "./use-channel";

export const useWatchState = <T extends Record<string, unknown>, R = T[keyof T], M extends Record<string, unknown> = Record<string, unknown>>(
  channelResult: ChannelResult<T, M>,
  selector?: (state: T) => R
) => {
  const selectorRef = useRef(selector ?? ((state: T) => state as unknown as R));

  const [value, setValue] = useState<R | undefined>(() => {
    if (channelResult.loading) return undefined;
    return selectorRef.current(channelResult.channel.current?.state ?? {});
  });

  useEffect(() => {
    if (channelResult.loading) return;

    const unwatch = channelResult.channel.current?.watchState((nextState) => {
      setValue(nextState);
    }, selectorRef.current);

    return () => unwatch();
  }, [channelResult.loading]);

  return value;
};
