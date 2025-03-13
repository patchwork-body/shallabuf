import { uneval } from "devalue";
import superjson from "superjson";

export const transformer = {
  input: superjson,
  output: {
    serialize: (object: unknown) => uneval(object),
    // This `eval` only ever happens on the **client**
    // biome-ignore lint/security/noGlobalEval: This is safe because we control the input
    deserialize: (object: string) => eval(`(${object})`),
  },
};
