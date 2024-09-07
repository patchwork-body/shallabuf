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
    <aside className="fixed top-0 left-0 flex flex-col h-screen w-64 bg-slate-800 p-4">
      <DeckList userId={user.id} decks={decks} />

      <Separator />

      <div className="mt-auto">
        <UserPanel />
      </div>
    </aside>
  );
};
