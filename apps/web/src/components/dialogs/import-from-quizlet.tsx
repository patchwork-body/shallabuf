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
import { Input } from "@shallabuf/ui/input";
import { Label } from "@shallabuf/ui/label";

export const ImportFromQuizletDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">Import from Quizlet</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import from Quizlet</DialogTitle>

          <DialogDescription>
            Import Quizlet flashcards into your deck
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="public-link" className="text-right">
              Public Link
            </Label>

            <Input
              id="public-link"
              type="url"
              className="col-span-3"
              placeholder="https://quizlet.com/flash-cards"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="submit">Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
