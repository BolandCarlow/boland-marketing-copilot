import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  async function signOut() {
    "use server";
    const client = await createClient();
    await client.auth.signOut();
    redirect("/auth");
  }

  return <div className="min-h-screen bg-slate-950 md:flex">
    <aside className="border-b border-slate-800 bg-slate-900 p-6 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Boland</p>
      <h1 className="mt-2 text-xl font-bold">Marketing Copilot</h1>
      <nav className="mt-10 space-y-2 text-sm"><Link className="block rounded-lg px-3 py-2 transition hover:bg-slate-800" href="/dashboard">Lead intelligence</Link><Link className="block rounded-lg px-3 py-2 transition hover:bg-slate-800" href="/dashboard/settings/integrations">Integrations</Link><span className="block rounded-lg px-3 py-2 text-slate-500">Lead reports <span className="float-right text-xs">Soon</span></span></nav>
      <div className="mt-10 border-t border-slate-800 pt-5 text-sm text-slate-400"><p className="truncate">{user.email}</p><form action={signOut}><button className="mt-3 text-cyan-300">Sign out</button></form></div>
    </aside>
    <main className="flex-1 p-6 md:p-10">{children}</main>
  </div>;
}
