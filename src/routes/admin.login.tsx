import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { supabase } from "@/integrations/supabase/client";

const OWNER_EMAIL = "info@enlivennotary.com";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Sign In | Enliven Notary" },
      { name: "description", content: "Sign in to the private Enliven Notary admin area." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Sign In | Enliven Notary" },
      { property: "og:description", content: "Sign in to the private Enliven Notary admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/admin/dashboard", replace: true });
    });
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Incorrect email or password.");
        return;
      }
      await router.navigate({ to: "/admin/dashboard", replace: true });
    } finally {
      setBusy(false);
    }
  }


  return (
    <>
      <PageHero
        eyebrow="Private"
        title={<>Admin <span className="italic font-light text-gradient-gold">sign in.</span></>}
        intro="This area is for Enliven Notary staff only."
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe max-w-md">
          <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-8">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <div className="mt-2 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
              />
            </div>

            <label htmlFor="password" className="mt-6 block text-sm font-medium">Password</label>
            <div className="mt-2 relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
              />
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="btn-gold mt-6 w-full rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
            >
              {busy ? "Please wait…" : "Sign in"}
            </button>

          </form>
        </div>
      </section>
    </>
  );
}
