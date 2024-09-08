import { getUser } from "@/helpers/get-user";
import { Avatar, AvatarFallback } from "@shallabuf/ui/avatar";

export const UserPanel = async () => {
  const user = await getUser();

  return (
    <div>
      <Avatar>
        <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
    </div>
  );
};
