import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/ui";
import LaporanClient from "@/components/laporan";

export const metadata = { title: "Analisis Keuangan" };

export const instant = false;

export default async function LaporanPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/kasir");
  return (
    <Shell user={{ name: session.name, username: session.username, role: session.role }}>
      <LaporanClient />
    </Shell>
  );
}
