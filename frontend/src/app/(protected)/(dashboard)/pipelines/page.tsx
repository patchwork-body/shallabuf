import Link from "next/link";
import { env } from "~/env";
import { getSessionToken } from "~/lib/auth";

interface Pipeline {
	id: string;
	name: string;
	description: string;
}

export default async function Home() {
	const sessionToken = await getSessionToken();

	const pipelines_req = await fetch(`${env.API_URL}/pipelines`, {
		headers: {
			Authorization: `Bearer ${sessionToken}`,
		},
	});

	const pipelines: Pipeline[] = await pipelines_req.json();

	return (
		<ul className="w-full max-w-2xl">
			{pipelines.map((pipeline) => (
				<li
					key={pipeline.id}
					className="group border border-primary/10 rounded-lg p-6 mt-4 shadow-lg hover:shadow-xl bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:bg-card/90"
				>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-xl font-bold text-primary">{pipeline.name}</h2>

						<Link
							href={`/editor/${pipeline.id}`}
							className="text-sm text-primary hover:text-primary/80 transition-colors"
						>
							Edit →
						</Link>
					</div>
					<p className="text-muted-foreground">{pipeline.description}</p>
				</li>
			))}
		</ul>
	);
}
