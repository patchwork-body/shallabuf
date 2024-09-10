import { PlayAudio } from "@/components/play-audio";
import { type Card as CardType, cardTable, deckTable } from "@/db/schema";
import { getUser } from "@/helpers/get-user";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { Badge } from "@shallabuf/ui/badge";
import { Button } from "@shallabuf/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@shallabuf/ui/card";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await getUser();

  const cards = await db
    .select({
      deck: deckTable,
      card: cardTable,
    })
    .from(deckTable)
    .where(and(eq(deckTable.id, params.id), eq(deckTable.userId, user.id)))
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
    <div className="pb-4">
      <header className="sticky top-[var(--header-height)] min-w-full bg-background pb-4">
        <h2>{deck.name}</h2>
      </header>

      <ul className="grid gird-flow-row lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {deck.cards.map((card) => (
          <li key={card.id}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div
                  className="h-12 w-12 bg-cover bg-center rounded-full border-border border-2"
                  style={{ backgroundImage: `url(${card.image})` }}
                />

                <PlayAudio audioUrl={card.frontAudio} />
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
