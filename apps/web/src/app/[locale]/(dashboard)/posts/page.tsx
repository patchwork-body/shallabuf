import { fooTable } from "@/db/schema";
import { db } from "@shallabuf/turso";
import { Suspense } from "react";

export const metadata = {
  title: "Posts",
};

export default async function Page() {
  const foos = await db.select().from(fooTable).all();

  return (
    <Suspense fallback="Loading...">
      <ul>
        {foos.map((foo) => (
          <li key={foo.bar}>{foo.bar}</li>
        ))}
      </ul>
    </Suspense>
  );
}
