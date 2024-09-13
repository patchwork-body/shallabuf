import { Flashcard } from "@/components/flashcard";
import { getUser } from "@/helpers/get-user";
import { logger } from "@shallabuf/logger";
import { db } from "@shallabuf/turso";
import {
  type Card as CardType,
  cardTable,
  deckTable,
} from "@shallabuf/turso/schema";
import { and, eq } from "drizzle-orm";

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
    <div className="pb-4 max-w-screen-2xl mx-auto">
      <header className="sticky z-10 top-[var(--header-height)] min-w-full bg-background pb-4">
        <h2>{deck.name}</h2>
      </header>

      <ul className="grid gird-flow-row lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {deck.cards.map((card) => (
          <li key={card.id}>
            <Flashcard card={card} />
          </li>
        ))}
      </ul>
    </div>
  );
}
