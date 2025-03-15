import { redirect } from "next/navigation";
import { Providers } from "~/app/(protected)/(dashboard)/_providers";
import { LogoutButton } from "~/components/features/auth/logout-button";
import { CreatePipelineDialog } from "~/components/features/pipeline/create-pipeline-dialog";
import { ThemeToggle } from "~/components/features/settings/theme-toggle";
import { getSessionToken } from "~/lib/auth";
import { trpc } from "~/trpc/server";

interface Team {
	id: string;
	name: string;
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const sessionToken = await getSessionToken();

	if (!sessionToken) {
		return redirect("/auth/login");
	}

	const user = await trpc.user.me();

	return (
		<Providers session_token={sessionToken}>
			<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
				<header className="flex items-center justify-center gap-4">
					<h1 className="text-3xl font-bold text-center text-primary">
						Pipelines
					</h1>

					<CreatePipelineDialog teamId={user.organizations[0].teams[0].id} />
					<ThemeToggle />
					<LogoutButton />
				</header>

				{children}
			</div>
		</Providers>
	);
}
