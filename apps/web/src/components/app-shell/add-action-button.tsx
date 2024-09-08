"use client";
import { createDeck } from "@/actions/decks/create";
import { Button } from "@shallabuf/ui/button";
import { Plus } from "lucide-react";

export const AddActionButton = () => {
  return (
    <Button
      size="icon"
      aria-label="Add new deck"
      onClick={async () => {
        await createDeck({ name: "New Deck" });
      }}
    >
      <Plus />
    </Button>
  );
};
