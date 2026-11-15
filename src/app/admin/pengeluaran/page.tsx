import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/ui";
import PengeluaranClient from "@/components/kelola-pengeluaran";

export const instant = false;

export const metadata = { title: "Pengeluaran" };

export default async function PengeluaranPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/kasir");
  return (
    <Shell user={{ name: session.name, username: session.username, role: session.role }}>
      <PengeluaranClient />
    </Shell>
  );
}
