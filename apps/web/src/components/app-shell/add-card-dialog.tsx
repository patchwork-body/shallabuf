"use client";
import { createCardsAction } from "@/actions/cards/create";
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
import { ScrollArea } from "@shallabuf/ui/scroll-area";
import { Separator } from "@shallabuf/ui/separator";
import { Loader, Plus, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useParams } from "next/navigation";
import { type MouseEventHandler, useCallback, useState } from "react";

const formItemClass = "flex items-center";
const formLabelClass = "w-1/4 text-right mr-4";
const formControlClass = "w-3/4";

export const AddCardDialog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<string[]>([nanoid()]);

  const { form, handleSubmitWithAction } = useHookFormAction(
    createCardsAction,
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
      actionProps: {
        onSuccess: () => {
          toggleDialogOpen();
        },
      },
    },
  );

  const toggleDialogOpen = useCallback(() => {
    form.reset();
    setIsDialogOpen((prev) => !prev);
    setRows([nanoid()]);
  }, [setIsDialogOpen, form.reset, setRows]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, nanoid()]);

    form.setValue("cards", [
      ...form.getValues().cards,
      { front: "", back: "" },
    ]);
  }, [setRows, form.setValue, form.getValues]);

  const removeRow: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const dataIndex = (event.target as HTMLElement)
        .closest("li")
        ?.getAttribute("data-index");

      if (!dataIndex) {
        return;
      }

      const index = Number.parseInt(dataIndex);

      setRows((prev) => prev.filter((_, i) => i !== index));

      form.setValue(
        "cards",
        form.getValues().cards.filter((_, i) => i !== index),
      );
    },
    [setRows, form.setValue, form.getValues],
  );

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
            className="flex flex-col gap-y-4 min-w-80"
            onSubmit={handleSubmitWithAction}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Add Cards</DialogTitle>
              <DialogDescription>
                Add new cards to this deck. You can add as many cards as you
                want.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-80">
              <ul className="flex flex-col mt-4">
                {rows.map((id, index) => {
                  return (
                    <li
                      data-index={index}
                      className="relative flex flex-col gap-y-2 p-3 rounded-lg"
                      key={id}
                    >
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute w-6 h-6 p-1 left-0 top-3 text-muted-foreground"
                          onClick={removeRow}
                        >
                          <X />
                        </Button>
                      )}

                      <FormField
                        name={`cards.${index}.front`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className={formItemClass}>
                            <FormLabel className={formLabelClass}>
                              Front
                            </FormLabel>

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
                        name={`cards.${index}.back`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className={formItemClass}>
                            <FormLabel className={formLabelClass}>
                              Back
                            </FormLabel>

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

                      {index !== rows.length - 1 && (
                        <Separator className="mt-6" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>

            <Button type="button" variant="ghost" onClick={addRow}>
              <Plus />
              Add card
            </Button>

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
