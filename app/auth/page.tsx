import { AuthForm } from "./auth-form";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;
  return <AuthForm initialMessage={error} />;
}
