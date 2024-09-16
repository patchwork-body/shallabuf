import { deleteCardAction } from "@/actions/cards/delete";
import type { Card } from "@shallabuf/turso/schema";
import { Button } from "@shallabuf/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shallabuf/ui/dialog";
import { Loader, Trash } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useState } from "react";

export type DeleteCardDialogProps = {
  card: Card;
};

export const DeleteCardDialog = ({ card }: DeleteCardDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { execute, isExecuting } = useAction(deleteCardAction);

  const toggleDialogOpen = useCallback(() => {
    setIsDialogOpen((prev) => !prev);
  }, [setIsDialogOpen]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center justify-start gap-x-2 min-w-full text-destructive hover:text-destructive"
        >
          <Trash className="w-4 h-4" />
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Card</DialogTitle>
          <DialogDescription>
            This action will be irreversible
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isExecuting}
            onClick={toggleDialogOpen}
          >
            Cancel
          </Button>

          <Button
            className="flex gap-x-4"
            variant="destructive"
            disabled={isExecuting}
            aria-busy={isExecuting}
            onClick={() =>
              execute({
                cardId: card.id,
              })
            }
          >
            Delete
            {isExecuting && (
              <span className="animate-spin">
                <Loader />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
