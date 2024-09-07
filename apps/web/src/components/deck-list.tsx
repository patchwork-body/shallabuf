"use client";
import { createDeck } from "@/actions/decks/create";
import type { Deck } from "@/db/schema";
import { Button } from "@shallabuf/ui/button";
import { ScrollArea } from "@shallabuf/ui/scroll-area";
import { CirclePlus } from "lucide-react";
import { nanoid } from "nanoid";
import { useOptimisticAction } from "next-safe-action/hooks";

export type DeckListProps = {
  userId: string;
  decks: Deck[];
};

export function DeckList(props: DeckListProps) {
  const { execute, isPending, optimisticState } = useOptimisticAction(
    createDeck,
    {
      currentState: { decks: props.decks },
      updateFn: (state, { name }) => {
        return {
          decks: [
            ...state.decks,
            {
              id: nanoid(),
              createdAt: Number(new Date().toISOString()),
              userId: props.userId,
              name,
            },
          ],
        };
      },
    },
  );

  return (
    <div className="flex flex-col gap-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Decks</h1>

        <Button
          disabled={isPending}
          variant="default"
          size="icon"
          onClick={() => {
            execute({ name: "New Deck" });
          }}
        >
          <CirclePlus />
        </Button>
      </header>

      <ScrollArea className="h-[82dvh]">
        <ul>
          {optimisticState.decks.map((deck) => (
            <li key={deck.id}>{deck.name}</li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
