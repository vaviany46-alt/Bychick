import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/ui";
import MenuClient from "@/components/kelola-menu";

export const metadata = { title: "Kelola Menu" };

export const instant = false;

export default async function MenuPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/kasir");
  return (
    <Shell user={{ name: session.name, username: session.username, role: session.role }}>
      <MenuClient />
    </Shell>
  );
}
