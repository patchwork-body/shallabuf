import { useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogProps,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { CopyIcon, CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export interface AppCredentials {
  appId: string;
  appSecret: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={copy}>
      {copied ? (
        <CheckIcon className="w-3 h-3" />
      ) : (
        <CopyIcon className="w-3 h-3" />
      )}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

export interface AppCredentialsDialogProps extends AlertDialogProps {
  credentials: AppCredentials | null;
  onClose: () => void;
}

export function AppCredentialsDialog({
  credentials,
  onClose,
  ...props
}: AppCredentialsDialogProps) {
  const [open, setOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    setOpen(!!credentials);
  }, [credentials]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen} {...props}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>App Created Successfully</AlertDialogTitle>
          <AlertDialogDescription className="text-destructive bg-destructive/20 border border-destructive/50 p-2 rounded-md font-semibold">
            Warning: The app secret will be shown only once. Please save it
            securely.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>App ID</Label>
            <div className="flex items-center gap-2">
              <Input value={credentials?.appId ?? ""} readOnly />
              <CopyButton text={credentials?.appId ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>App Secret</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  className="pr-12"
                  value={credentials?.appSecret ?? ""}
                  readOnly
                  type={showSecret ? "text" : "password"}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                  <span className="sr-only">
                    {showSecret ? "Hide secret" : "Show secret"}
                  </span>
                </Button>
              </div>
              <CopyButton text={credentials?.appSecret ?? ""} />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}