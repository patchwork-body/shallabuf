"use client";
import { createCards } from "@/actions/cards/create";
import { createCardsSchema } from "@/lib/validation/create-card.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shallabuf/ui/form";
import { Input } from "@shallabuf/ui/input";
import { Loader, Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

export const AddCardActionButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const toggleDialogOpen = useCallback(
    () => setIsDialogOpen((prev) => !prev),
    [setIsDialogOpen],
  );
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<string[]>([nanoid()]);

  const { form, handleSubmitWithAction } = useHookFormAction(
    createCards,
    zodResolver(createCardsSchema),
    {
      formProps: {
        mode: "onSubmit",
        defaultValues: {
          cards: [{ front: "", back: "" }],
          deckId: params.id,
        },
        reValidateMode: "onSubmit",
      },
    },
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, nanoid()]);
  }, [setRows]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          disabled={form.formState.isSubmitting}
          aria-label="Add card"
        >
          <Plus />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <Form {...form}>
          <form
            className="flex flex-col space-y-4 min-w-80"
            onSubmit={handleSubmitWithAction}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Add a new card to this deck. You can add as many cards as you
                want.
              </DialogDescription>

              <ul>
                {rows.map((id, index) => {
                  return (
                    <li key={id}>
                      <FormField
                        name={`cards.${index}.front`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Front</FormLabel>

                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Front of the card"
                                aria-required="true"
                                {...field}
                              />
                            </FormControl>

                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name={`cards.${index}.back`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Back</FormLabel>

                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Back of the card"
                                aria-required="true"
                                {...field}
                              />
                            </FormControl>

                            <FormDescription />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </li>
                  );
                })}
              </ul>

              <Button type="button" variant="ghost" onClick={addRow}>
                <Plus />
                Add card
              </Button>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
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
            </DialogHeader>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
