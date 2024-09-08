"use client";
import { createDeck } from "@/actions/decks/create";
import { Button } from "@shallabuf/ui/button";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

export const AddDeckActionButton = () => {
  const { execute, isPending } = useAction(createDeck);

  return (
    <Button
      size="icon"
      disabled={isPending}
      aria-label="Add new deck"
      onClick={async () => {
        execute({ name: "New Deck" });
      }}
    >
      <Plus />
    </Button>
  );
};
