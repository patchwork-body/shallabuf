import { useEffect, useRef, useState } from "react";
import { ChannelResult } from "./use-channel";

export const useWatchMembers = <
  T extends Record<string, unknown>,
  M extends Record<string, unknown>,
  R = M[keyof M]
>(
  channelResult: ChannelResult<T, M>,
  selector?: (members: Record<string, M>) => R
) => {
  const selectorRef = useRef(selector ?? ((members: Record<string, M>) => members as unknown as R));

  const [value, setValue] = useState<R | undefined>(() => {
    if (channelResult.loading) return undefined;
    return selectorRef.current(channelResult.channel.current?.members ?? {} as Record<string, M>);
  });

  useEffect(() => {
    if (channelResult.loading) return;

    const unwatch = channelResult.channel.current?.watchMembers(
      (nextMembers) => {
        setValue(nextMembers);
      },
      selectorRef.current
    );

    return () => unwatch();
  }, [channelResult.loading]);

  return value;
};
