import Link from "next/link";
import { trpc } from "~/trpc/server";

export default async function OrgsPage() {
	const user = await trpc.user.me();

	return (
		<ul className="w-full max-w-2xl">
			{user.organizations.map((org) => (
				<li
					key={org.id}
					className="group border border-primary/10 rounded-lg p-6 mt-4 shadow-lg hover:shadow-xl bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:bg-card/90"
				>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-xl font-bold text-primary">{org.name}</h2>

						<Link
							href={`/orgs/${org.id}/teams`}
							className="text-sm text-primary hover:text-primary/80 transition-colors"
						>
							View Teams →
						</Link>
					</div>
				</li>
			))}
		</ul>
	);
}
