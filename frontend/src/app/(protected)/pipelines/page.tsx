import Link from "next/link";
import { LogoutButton } from "~/components/features/auth/logout-button";
import { CreatePipelineDialog } from "~/components/features/pipeline/create-pipeline-dialog";
import { ThemeToggle } from "~/components/features/settings/theme-toggle";
import { env } from "~/env";
import { getSessionToken } from "~/lib/auth";

interface Pipeline {
  id: string;
  name: string;
  description: string;
}

interface Team {
  id: string;
  name: string;
}

export default async function Home() {
  const sessionToken = await getSessionToken();

  const pipelines_req = fetch(`${env.API_URL}/pipelines`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const teams_req = fetch(`${env.API_URL}/teams`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const [pipelines_res, teams_res] = await Promise.all([
    pipelines_req,
    teams_req,
  ]);

  const [pipelines, teams]: [Pipeline[], Team[]] = await Promise.all([
    pipelines_res.json(),
    teams_res.json(),
  ]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex items-center justify-center gap-4">
        <h1 className="text-3xl font-bold text-center text-primary">
          Pipelines
        </h1>
        <CreatePipelineDialog teamId={teams[0].id} />
        <ThemeToggle />
        <LogoutButton />
      </header>

      <ul className="w-full max-w-2xl">
        {pipelines.map((pipeline) => (
          <li
            key={pipeline.id}
            className="group border border-primary/10 rounded-lg p-6 mt-4 shadow-lg hover:shadow-xl bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:bg-card/90"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-primary">
                {pipeline.name}
              </h2>
              <Link
                href={`/pipelines/${pipeline.id}`}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Edit →
              </Link>
            </div>
            <p className="text-muted-foreground">{pipeline.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
