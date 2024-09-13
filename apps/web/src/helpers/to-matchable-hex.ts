export const toMatchableHex = (input: string) => {
  return Buffer.from(
    input.toLocaleLowerCase().trim().replace(/\s+/g, " "),
  ).toString("hex");
};
