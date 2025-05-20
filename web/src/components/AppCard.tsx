import { useState } from "react";
import { AppInfo } from "~/lib/schemas";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./ui/dialog";

interface AppCardProps {
  app: AppInfo;
  onDelete: () => void;
  isDeleting: boolean;
}

export function AppCard({ app, onDelete, isDeleting }: AppCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card
      key={app.appId}
      className="hover:bg-gray-50 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 dark:from-primary/10 dark:via-accent/10 dark:to-secondary/10 group-hover:opacity-100 transition-opacity rounded-xl dark:hover:bg-gray-800 hover:shadow-lg dark:hover:shadow-lg/10 hover:scale-[1.02] group"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-2xl font-bold dark:text-white">
              {app.name}
            </CardTitle>
            <CardDescription className="text-muted-foreground dark:text-white/80">
              {app.description || "No description"}
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="ml-2"
                onClick={() => setOpen(true)}
              >
                Remove
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove App</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove{" "}
                  <span className="font-semibold">{app.name}</span>? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isDeleting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Removing..." : "Remove"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
    </Card>
  );
}
