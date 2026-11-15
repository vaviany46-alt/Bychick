import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/ui";
import PosClient from "@/components/pos";

export const metadata = { title: "Kasir" };

export const instant = false;

export default async function KasirPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <Shell user={{ name: session.name, username: session.username, role: session.role }}>
      <PosClient kasirName={session.name} />
    </Shell>
  );
}
