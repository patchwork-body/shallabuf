import {
  createFileRoute,
  redirect,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { trpc } from "~/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { env } from "~/env";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { object, string } from "valibot";
import { setHeader } from "@tanstack/react-start/server";

const acceptInviteFn = createServerFn({ method: "POST" })
  .validator(object({ token: string() }))
  .handler(async ({ data }) => {
    const response = await fetch(`${env.API_URL}/invites/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to accept invite");
    }

    const responseData = await response.json();

    if (responseData.resetPasswordToken) {
      setHeader("Set-Cookie", [
        "session=; HttpOnly; Path=/; SameSite=Lax; Secure=true; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ]);

      throw redirect({
        to: "/reset-password",
        search: { token: responseData.resetPasswordToken },
      });
    }

    throw redirect({
      to: "/orgs/$orgId/apps",
      params: { orgId: responseData.organizationId },
    });
  });

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
    };
  },
  component: AcceptInviteComponent,
});

function AcceptInviteComponent() {
  const search = useSearch({ from: "/accept-invite" });
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const acceptInvitation = useServerFn(acceptInviteFn);

  useEffect(() => {
    const acceptInvite = async () => {
      if (!search.token) {
        setStatus("error");
        setErrorMessage("No invitation token provided");
        return;
      }

      try {
        await acceptInvitation({ data: { token: search.token } });
        setStatus("success");
      } catch (error: any) {
        setStatus("error");
        setErrorMessage(error.message || "Failed to accept invitation");
      }
    };

    acceptInvite();
  }, [search.token, acceptInvitation, router]);

  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "pending" && (
              <Loader2 className="w-6 h-6 animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
            {status === "error" && <XCircle className="w-6 h-6 text-red-600" />}
            {status === "pending" && "Processing Invitation"}
            {status === "success" && "Invitation Accepted!"}
            {status === "error" && "Invitation Failed"}
          </CardTitle>

          <CardDescription>
            {status === "pending" &&
              "Please wait while we process your invitation..."}
            {status === "success" &&
              "Welcome to the team! You can now log in to access your account."}
            {status === "error" && errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {status === "success" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You will be redirected to the login page in a few seconds...
              </p>
              <Button
                onClick={() => router.navigate({ to: "/login" })}
                className="w-full"
              >
                Go to Login Now
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                The invitation link may have expired or already been used.
              </p>
              <Button
                onClick={() => router.navigate({ to: "/login" })}
                variant="outline"
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === "pending" && (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
