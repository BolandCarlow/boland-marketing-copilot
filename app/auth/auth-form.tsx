"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ initialMessage }: { initialMessage?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("email");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    setMessage(error ? error.message : "Check your inbox for a secure sign-in link.");
    setBusy(null);
  }

  async function signInWithGoogle() {
    setBusy("google");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) {
      setMessage(error.message);
      setBusy(null);
    }
  }

  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Boland</p><h1 className="mt-3 text-3xl font-bold">Marketing Copilot</h1><p className="mt-3 text-slate-400">Your shared view of marketing performance, ready when you are.</p><button type="button" disabled={busy !== null} onClick={signInWithGoogle} className="mt-7 w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 disabled:opacity-60">{busy === "google" ? "Connecting…" : "Continue with Google"}</button><div className="my-6 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-700" />or<span className="h-px flex-1 bg-slate-700" /></div><form onSubmit={signIn} className="space-y-3"><label className="block text-sm font-medium">Work email<input required type="email" value={email} disabled={busy !== null} onChange={(event) => setEmail(event.target.value)} placeholder="you@boland.ie" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-cyan-300 focus:ring-2 disabled:opacity-60" /></label><button disabled={busy !== null} className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{busy === "email" ? "Sending…" : "Email me a sign-in link"}</button></form>{message && <p className="mt-4 text-sm text-cyan-200" role="status">{message}</p>}</section></main>;
}

