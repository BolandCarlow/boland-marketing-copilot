import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  async function signOut() { "use server"; const client = await createClient(); await client.auth.signOut(); redirect("/auth"); }
  return <DashboardShell email={user.email ?? "Boland team"} signOut={signOut}>{children}</DashboardShell>;
}
