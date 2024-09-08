import { redirect } from "next/navigation";
import { validateSession } from "./validate-session";

export const getUser = async () => {
  const { user } = await validateSession();

  if (!user) {
    return redirect("/login");
  }

  return user;
};
