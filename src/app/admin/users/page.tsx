import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/ui";
import UsersClient from "@/components/kelola-users";

export const metadata = { title: "Pengguna" };

export const instant = false;

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/kasir");
  return (
    <Shell user={{ name: session.name, username: session.username, role: session.role }}>
      <UsersClient />
    </Shell>
  );
}
