"use client";
import { createCard } from "@/actions/cards/create";
import { Button } from "@shallabuf/ui/button";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";

export const AddCardActionButton = () => {
  const { execute, isPending } = useAction(createCard);
  const params = useParams<{ id: string }>();

  return (
    <div>
      <Button
        size="icon"
        disabled={isPending}
        aria-label="Add new card"
        onClick={async () => {
          execute({
            front: "hello there",
            back: "possum",
            deckId: params.id,
          });
        }}
      >
        <Plus />
      </Button>
    </div>
  );
};
