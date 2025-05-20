import { Button } from "./ui/button";
import { redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { github, google } from "~/lib/oauth";
import { generateCodeVerifier, generateState } from "arctic";
import { setHeader } from "@tanstack/react-start/server";
import { cn } from "~/lib/utils";
import { Loader2 } from "lucide-react";

// Icons for social login buttons
const GoogleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GithubIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"
    />
  </svg>
);

interface SocialLoginButtonProps extends React.ComponentProps<"button"> {
  provider: "google" | "github";
  loading?: boolean;
}

const icons = {
  google: GoogleIcon,
  github: GithubIcon,
};

const SocialLoginButton = ({
  provider,
  className,
  loading,
  ...props
}: SocialLoginButtonProps) => {
  const Icon = icons[provider];

  return (
    <Button
      variant="outline"
      className={cn("w-full flex items-center justify-center gap-2", className)}
      {...props}
    >
      <Icon />
      <span>
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            Continue with <span className="capitalize">{provider}</span>
          </>
        )}
      </span>
    </Button>
  );
};

const githubAuth = createServerFn({ method: "GET" }).handler(async () => {
  const state = generateState();
  const url = github.createAuthorizationURL(state, ["user:email", "read:user"]);

  setHeader(
    "Set-Cookie",
    `github_oauth_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );

  throw redirect({ href: url.toString() });
});

function GithubLoginButton({
  className,
}: Omit<SocialLoginButtonProps, "provider">) {
  const loginWithGithub = useServerFn(githubAuth);

  const loginWithGithubQuery = useMutation({
    mutationFn: loginWithGithub,
  });

  return (
    <SocialLoginButton
      className={className}
      provider="github"
      disabled={loginWithGithubQuery.isPending}
      onClick={async () => loginWithGithubQuery.mutateAsync({})}
    />
  );
}

const googleAuth = createServerFn({ method: "GET" }).handler(async () => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  // Set secure cookie attributes
  const cookieOptions = [
    'Path=/',
    'HttpOnly',
    'Max-Age=600',
    'SameSite=Lax',
    process.env.NODE_ENV === "production" ? 'Secure' : '',
  ].filter(Boolean).join('; ');

  // Set both cookies with consistent attributes
  setHeader(
    "Set-Cookie",
    [
      `google_oauth_state=${state}; ${cookieOptions}`,
      `google_code_verifier=${codeVerifier}; ${cookieOptions}`,
    ]
  );

  throw redirect({ href: url.toString() });
});

function GoogleLoginButton({
  className,
}: Omit<SocialLoginButtonProps, "provider">) {
  const loginWithGoogle = useServerFn(googleAuth);

  const loginWithGoogleQuery = useMutation({
    mutationFn: loginWithGoogle,
  });

  return (
    <SocialLoginButton
      className={className}
      provider="google"
      disabled={loginWithGoogleQuery.isPending}
      onClick={async () => loginWithGoogleQuery.mutateAsync({})}
    />
  );
}

export function SocialLoginButtons() {
  return (
    <div className="flex flex-col gap-3">
      <GithubLoginButton />
      <GoogleLoginButton />
    </div>
  );
}
