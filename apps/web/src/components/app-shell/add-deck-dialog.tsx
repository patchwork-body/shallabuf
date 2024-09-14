"use client";
import { createDeckAction } from "@/actions/decks/create";
import { createDeckSchema } from "@/lib/validation/create-deck.schema";
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

const formItemClass = "flex items-center";
const formLabelClass = "w-1/4 text-right mr-4";
const formControlClass = "w-3/4";

export const AddDeckDialog = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { form, handleSubmitWithAction } = useHookFormAction(
    createDeckAction,
    zodResolver(createDeckSchema),
    {
      formProps: {
        mode: "onSubmit",
        defaultValues: {
          name: "",
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
  }, [setIsDialogOpen, form.reset]);

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
              <DialogTitle>Add Deck</DialogTitle>
              <DialogDescription>
                A new deck will be added to your collection.
              </DialogDescription>
            </DialogHeader>

            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem className={formItemClass}>
                  <FormLabel className={formLabelClass}>Deck name</FormLabel>

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
