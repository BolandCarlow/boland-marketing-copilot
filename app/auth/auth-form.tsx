"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ initialMessage }: { initialMessage?: string }) {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(initialMessage ?? ""); const [busy, setBusy] = useState<"email" | "google" | null>(null);
  async function signIn(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy("email"); setMessage(""); const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } }); setMessage(error ? error.message : "Check your inbox for a secure sign-in link."); setBusy(null); }
  async function signInWithGoogle() { setBusy("google"); setMessage(""); const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } }); if (error) { setMessage(error.message); setBusy(null); } }
  return <main className="auth-shell"><section className="card auth-card"><span className="brand-mark">B</span><p className="eyebrow" style={{ marginTop: 18 }}>Boland Carlow</p><h1>Marketing Copilot</h1><p>Sign in to review your dealership marketing performance.</p><button type="button" className="button w-full mt-6" disabled={busy !== null} onClick={signInWithGoogle}>{busy === "google" ? "Connecting…" : "Continue with Google"}</button><div className="auth-divider">or</div><form onSubmit={signIn} className="form-grid"><label>Work email<input required type="email" value={email} disabled={busy !== null} onChange={(event) => setEmail(event.target.value)} placeholder="you@boland.ie"/></label><button className="button primary" disabled={busy !== null}>{busy === "email" ? "Sending…" : "Email me a sign-in link"}</button></form>{message ? <p className="notice" role="status">{message}</p> : null}</section></main>;
}
