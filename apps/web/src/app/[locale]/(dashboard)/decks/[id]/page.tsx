import { ImportFromQuizletDialog } from "@/components/dialogs/import-from-quizlet";
import { type Card, cardTable, deckTable } from "@/db/schema";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import { eq } from "drizzle-orm";

export default async function Page({ params }: { params: { id: string } }) {
  const cards = await db
    .select()
    .from(cardTable)
    .where(eq(cardTable.deckId, params.id))
    .leftJoin(deckTable, eq(cardTable.deckId, deckTable.id))
    .all();

  const deck = cards.reduce(
    (acc, row) => {
      if (acc[row.card.deckId]) {
        acc[row.card.deckId]?.cards.push(row.card);
      } else {
        acc[row.card.deckId] = {
          name: row.deck!.name,
          cards: [row.card],
        };
      }

      return acc;
    },
    {} as Record<string, { name: string; cards: Card[] }>,
  )[params.id];

  if (!deck) {
    logger.error("Deck not found");
    return "Deck not found";
  }

  return (
    <div className="space-y-4">
      <h1>{deck.name}</h1>

      <ul>
        {deck.cards.map((card) => (
          <li key={card.id}>
            <div>{card.front}</div>
            <div>{card.back}</div>
          </li>
        ))}
      </ul>

      <ImportFromQuizletDialog />
    </div>
  );
}
