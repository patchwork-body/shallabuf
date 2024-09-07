import { Sidebar } from "@/components/sidebar";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      {children}
    </>
  );
}
