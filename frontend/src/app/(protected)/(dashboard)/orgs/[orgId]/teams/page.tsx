import Link from "next/link";
import { trpc } from "~/trpc/server";

export default async function TeamsPage({
	params,
}: {
	params: Promise<{ orgId: string }>;
}) {
	const { orgId } = await params;
	const user = await trpc.user.me();
	const organization =
		user.organizations.find((org) => org.id === orgId) ?? user.organizations[0];

	return (
		<ul className="w-full max-w-2xl">
			{organization.teams.map((team) => (
				<li
					key={team.id}
					className="group border border-primary/10 rounded-lg p-6 mt-4 shadow-lg hover:shadow-xl bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:bg-card/90"
				>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-xl font-bold text-primary">{team.name}</h2>

						<Link
							href={`/orgs/${orgId}/teams/${team.id}/pipelines`}
							className="text-sm text-primary hover:text-primary/80 transition-colors"
						>
							View Pipelines →
						</Link>
					</div>
				</li>
			))}
		</ul>
	);
}
