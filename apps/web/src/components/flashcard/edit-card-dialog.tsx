import { updateCardAction } from "@/actions/cards/update";
import { updateCardSchema } from "@/lib/validation/update-card.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormOptimisticAction } from "@next-safe-action/adapter-react-hook-form/hooks";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRootMessage,
} from "@shallabuf/ui/form";
import { Input } from "@shallabuf/ui/input";
import { Loader, Pencil } from "lucide-react";
import { useCallback, useState } from "react";

const formItemClass = "flex items-center";
const formLabelClass = "w-1/4 text-right mr-4";
const formControlClass = "w-3/4";

export type EditCardDialogProps = {
  card: Card;
  onCardUpdate: (card: Card) => void;
};

export const EditCardDialog = ({ card, onCardUpdate }: EditCardDialogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { form, handleSubmitWithAction } = useHookFormOptimisticAction(
    updateCardAction,
    zodResolver(updateCardSchema),
    {
      formProps: {
        mode: "onSubmit",
        defaultValues: {
          front: card.front,
          back: card.back,
          cardId: card.id,
        },
        reValidateMode: "onSubmit",
      },
      actionProps: {
        currentState: card,
        updateFn: (state, input) => {
          const updatedCard = {
            ...state,
            ...input,
          };

          return updatedCard;
        },
        onSuccess: ({ data }) => {
          toggleDialogOpen();
          if (!data) return;
          onCardUpdate(data?.card);
        },
      },
    },
  );

  const toggleDialogOpen = useCallback(() => {
    setIsDialogOpen((prev) => !prev);
  }, [setIsDialogOpen]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center justify-start gap-x-2 min-w-full"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <Form {...form}>
          <form
            className="flex flex-col gap-y-4 min-w-80"
            onSubmit={handleSubmitWithAction}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Edit Card</DialogTitle>
              <DialogDescription>
                You can update the front and back of the card here.
              </DialogDescription>
            </DialogHeader>

            <FormField
              name="front"
              control={form.control}
              render={({ field }) => (
                <FormItem className={formItemClass}>
                  <FormLabel className={formLabelClass}>Front</FormLabel>

                  <FormControl className={formControlClass}>
                    <Input
                      type="text"
                      placeholder="Front of the card"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="back"
              control={form.control}
              render={({ field }) => (
                <FormItem className={formItemClass}>
                  <FormLabel className={formLabelClass}>Back</FormLabel>

                  <FormControl className={formControlClass}>
                    <Input
                      type="text"
                      placeholder="Back of the card"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormRootMessage />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={toggleDialogOpen}
              >
                Cancel
              </Button>

              <Button
                className="flex gap-x-4"
                disabled={form.formState.isSubmitting}
                aria-busy={form.formState.isSubmitting}
              >
                Save
                {form.formState.isSubmitting && (
                  <span className="animate-spin">
                    <Loader />
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
