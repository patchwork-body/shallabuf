import { type Card as CardType, cardTable, deckTable } from "@/db/schema";
import { logger } from "@shallabuf/logger";
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
import { eq } from "drizzle-orm";
import { AudioLines } from "lucide-react";
import Link from "next/link";

export default async function Page({ params }: { params: { id: string } }) {
  const cards = await db
    .select({
      deck: deckTable,
      card: cardTable,
    })
    .from(deckTable)
    .where(eq(deckTable.id, params.id))
    .leftJoin(cardTable, eq(deckTable.id, cardTable.deckId))
    .all();

  const deck = cards.reduce(
    (acc, row) => {
      if (acc[row.deck.id] && row.card) {
        acc[row.deck.id]?.cards.push(row.card);
      } else {
        acc[row.deck.id] = {
          name: row.deck.name,
          cards: row.card ? [row.card] : [],
        };
      }

      return acc;
    },
    {} as Record<string, { name: string; cards: CardType[] }>,
  )[params.id];

  if (!deck) {
    logger.error("Deck not found");
    return "Deck not found";
  }

  return (
    <div className="space-y-4">
      <h2>{deck.name}</h2>

      <ul className="grid gird-flow-row lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {deck.cards.map((card) => (
          <li key={card.id}>
            <Card>
              <CardHeader>
                <Button className="ml-auto" variant="ghost" size="icon">
                  <AudioLines />
                </Button>
              </CardHeader>

              <CardContent className="flex place-content-center">
                <p>{card.front}</p>
              </CardContent>

              <CardFooter>
                <Badge variant="secondary">Front</Badge>

                <Button asChild variant="link" className="ml-auto">
                  <Link href={`/decks/${params.id}/cards/${card.id}`}>
                    Edit
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
