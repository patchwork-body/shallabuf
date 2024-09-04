import { Suspense } from "react";

export const metadata = {
  title: "Posts",
};

export default async function Page() {
  return (
    <Suspense fallback="Loading...">
      <ul>Hello there</ul>
    </Suspense>
  );
}
