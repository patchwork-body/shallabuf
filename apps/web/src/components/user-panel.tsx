import { getUser } from "@/helpers/get-user";

export const UserPanel = async () => {
  const user = await getUser();

  return (
    <div>
      <p className="text-md font-bold">{user.name}</p>
    </div>
  );
};
