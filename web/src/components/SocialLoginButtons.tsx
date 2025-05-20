import { Button } from "./ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";

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

const MicrosoftIcon = () => (
  <svg className="size-5" viewBox="0 0 23 23">
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78 1.18-.19 2.31-.89 3.51-.84 1.54.07 2.7.6 3.44 1.51-3.03 1.81-2.52 5.87.22 7.22-.65 1.67-1.46 3.3-2.25 4.3M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.66 4.23-3.74 4.25"
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

interface SocialLoginButtonProps {
  provider: "google" | "microsoft" | "apple" | "github";
  className?: string;
}

const SocialLoginButton = ({
  provider,
  className = "",
}: SocialLoginButtonProps) => {
  const navigate = useNavigate();
  const loginMutation = useMutation({
    ...trpc.auth.socialLogin.mutationOptions(),
    onSuccess: () => {
      navigate({ to: "/" });
    },
  });

  const icons = {
    google: GoogleIcon,
    microsoft: MicrosoftIcon,
    apple: AppleIcon,
    github: GithubIcon,
  };

  const labels = {
    google: "Continue with Google",
    microsoft: "Continue with Microsoft",
    apple: "Continue with Apple",
    github: "Continue with GitHub",
  };

  const Icon = icons[provider];

  return (
    <Button
      variant="outline"
      className={`w-full flex items-center justify-center gap-2 ${className}`}
      onClick={() => loginMutation.mutate({ provider })}
      disabled={loginMutation.isPending}
    >
      <Icon />
      <span>
        {loginMutation.isPending ? "Connecting..." : labels[provider]}
      </span>
    </Button>
  );
};

export function SocialLoginButtons() {
  return (
    <div className="flex flex-col gap-3">
      <SocialLoginButton provider="github" />
      <SocialLoginButton provider="google" />
      <SocialLoginButton provider="apple" />
      <SocialLoginButton provider="microsoft" />
    </div>
  );
}
