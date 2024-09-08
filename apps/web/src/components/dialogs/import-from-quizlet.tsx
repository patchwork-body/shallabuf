"use client";
import type { importRouteBodyValidationSchema } from "@/app/api/jobs/import/route";
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
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type FormData = z.infer<typeof importRouteBodyValidationSchema>;

export const ImportFromQuizletDialog = () => {
  const form = useForm<FormData>({
    // TODO: validation crashes project compilation
    // resolver: zodResolver(importRouteBodyValidationSchema),
    defaultValues: {
      provider: "quizlet",
      url: "",
    },
  });

  const onSubmit = useCallback(async (data: FormData) => {
    await fetch("/api/jobs/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">Import from Quizlet</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Import from Quizlet</DialogTitle>

              <DialogDescription>
                Import Quizlet flashcards into your deck
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                name="url"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Email</FormLabel>

                    <FormControl>
                      <Input
                        type="url"
                        className="col-span-3"
                        placeholder="https://quizlet.com/flash-cards"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage className="col-span-3" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit">Import</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
