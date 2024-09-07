import { deckTable } from "@/db/schema";
import { getUser } from "@/helpers/get-user";
import { db } from "@shallabuf/turso";
import { Separator } from "@shallabuf/ui/separator";
import { DeckList } from "./deck-list";
import { UserPanel } from "./user-panel";

export const Sidebar = async () => {
  const user = await getUser();
  const decks = await db.select().from(deckTable);

  return (
    <aside className="flex flex-col h-screen w-64 bg-secondary text-secondary-foreground p-4">
      <DeckList userId={user.id} decks={decks} />

      <Separator />

      <div className="mt-auto">
        <UserPanel />
      </div>
    </aside>
  );
};
