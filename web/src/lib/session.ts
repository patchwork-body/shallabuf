export const getSessionToken = (req: Request) => {
  return req.headers
    .get("Cookie")
    ?.split("; ")
    .find((row) => row.startsWith("session="))
    ?.split("=")[1];
};
