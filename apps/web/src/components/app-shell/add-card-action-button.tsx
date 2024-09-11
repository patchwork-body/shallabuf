"use client";
import { createCard } from "@/actions/cards/create";
import { Button } from "@shallabuf/ui/button";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";

export const AddCardActionButton = () => {
  const { execute, isPending } = useAction(createCard);
  const params = useParams();

  return (
    <div>
      <Button
        size="icon"
        disabled={isPending}
        aria-label="Add new card"
        onClick={async () => {
          execute({
            front: "disrupting factor",
            back: "possum",
            deckId: params.id as string,
          });
        }}
      >
        <Plus />
      </Button>
    </div>
  );
};
