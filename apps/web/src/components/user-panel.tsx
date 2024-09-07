import { getUser } from "@/helpers/get-user";

export const UserPanel = async () => {
  const user = await getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold">{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};
