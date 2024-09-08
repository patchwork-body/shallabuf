import { cardTable, deckTable } from "@/db/schema";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { Badge } from "@shallabuf/ui/badge";
import { Button } from "@shallabuf/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@shallabuf/ui/card";
import { count, eq } from "drizzle-orm";
import Link from "next/link";

export const metadata = {
  title: "Decks",
};

export default async function Page() {
  const decks = await db
    .select({
      deck: deckTable,
      cardCount: count(cardTable.id),
    })
    .from(deckTable)
    .leftJoin(cardTable, eq(deckTable.id, cardTable.deckId))
    .groupBy(deckTable.id)
    .all();

  return (
    <ul className="grid gird-flow-row sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {decks.map(({ deck, cardCount }) => (
        <li key={deck!.id}>
          <Card>
            <CardHeader>
              <CardTitle>{deck!.name}</CardTitle>
            </CardHeader>

            {/* <CardContent></CardContent> */}

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
