import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/ui";
import LogsClient from "@/components/logs";

export const metadata = { title: "Log Aktivitas" };

export const instant = false;

export default async function LogsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/kasir");
  return (
    <Shell user={{ name: session.name, username: session.username, role: session.role }}>
      <LogsClient />
    </Shell>
  );
}
