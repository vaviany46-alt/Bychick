import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/ui";
import TransaksiClient from "@/components/transaksi";

export const metadata = { title: "Transaksi" };

export const instant = false;

export default async function TransaksiPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <Shell user={{ name: session.name, username: session.username, role: session.role }}>
      <TransaksiClient />
    </Shell>
  );
}
