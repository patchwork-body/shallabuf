import { useState } from "react";
import { AppInfo } from "~/lib/schemas";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
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
    <Card key={app.appId} className="flex-row justify-between p-6">
      <CardHeader className="flex-1">
        <CardTitle>{app.name}</CardTitle>
        <CardDescription className="text-muted-foreground dark:text-white/80">
          {app.description || "No description"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
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
      </CardContent>
    </Card>
  );
}
