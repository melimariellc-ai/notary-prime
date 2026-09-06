import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/set-password")({
  head: () => ({
    meta: [
      { title: "Set Your Password | Enliven Notary" },
      { name: "description", content: "Set the password for your Enliven Notary account." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Set Your Password | Enliven Notary" },
      { property: "og:description", content: "Set the password for your Enliven Notary account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setReady(true);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Please use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await router.navigate({ to: "/admin/dashboard", replace: true });
  }

  return (
    <>
      <PageHero
        eyebrow="Welcome"
        title={<>Set your <span className="italic font-light text-gradient-gold">password.</span></>}
        intro="Choose a password to finish setting up your Enliven Notary account."
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8">
            {!ready ? (
              <p className="text-sm text-muted-foreground">Checking your link…</p>
            ) : !hasSession ? (
              <p className="text-sm text-muted-foreground">
                This link has expired or already been used. Email{" "}
                <a href="mailto:info@enlivennotary.com" className="text-gold">info@enlivennotary.com</a> and we'll send a new one.
              </p>
            ) : (
              <form onSubmit={onSubmit}>
                <label htmlFor="password" className="text-sm font-medium">New password</label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                  />
                </div>

                <label htmlFor="confirm" className="mt-6 block text-sm font-medium">Confirm password</label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                  />
                </div>

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-gold mt-6 w-full rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
