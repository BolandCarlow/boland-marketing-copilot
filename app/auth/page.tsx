import { AuthForm } from "./auth-form";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthForm initialMessage={error} />;
}
