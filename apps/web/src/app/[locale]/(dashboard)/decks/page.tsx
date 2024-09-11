import { cardTable, deckTable } from "@/db/schema";
import { getUser } from "@/helpers/get-user";
import { db } from "@shallabuf/turso";
import { Badge } from "@shallabuf/ui/badge";
import { Button } from "@shallabuf/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@shallabuf/ui/card";
import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";

export const metadata = {
  title: "Decks",
};

export default async function Page() {
  const user = await getUser();

  const decks = await db
    .select({
      deck: deckTable,
      cardCount: count(cardTable.id),
    })
    .from(deckTable)
    .where(eq(deckTable.userId, user.id))
    .leftJoin(cardTable, eq(deckTable.id, cardTable.deckId))
    .groupBy(deckTable.id)
    .orderBy(desc(deckTable.createdAt))
    .all();

  return (
    <ul className="grid gird-flow-row lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {decks.map(({ deck, cardCount }) => (
        <li key={deck!.id} className="min-h-28">
          <Card>
            <CardHeader>
              <CardTitle>{deck.name}</CardTitle>
            </CardHeader>

            <CardContent>
              <p>{deck.description}</p>
            </CardContent>

            <CardFooter>
              <Badge variant="secondary">
                {cardCount} {cardCount === 1 ? "card" : "cards"}
              </Badge>

              <Button asChild variant="link" className="ml-auto">
                <Link className="ml-auto" href={`/decks/${deck!.id}`}>
                  View
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}
