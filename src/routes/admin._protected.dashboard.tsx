import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LogOut, Lock, Mail, UserPlus } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { createAdminUser } from "@/lib/users.functions";

export const Route = createFileRoute("/admin/_protected/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Enliven Notary" },
      { name: "description", content: "Private admin area for Enliven Notary." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Dashboard | Enliven Notary" },
      { property: "og:description", content: "Private admin area for Enliven Notary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const router = useRouter();
  const user = Route.useRouteContext().user;
  const addUser = useServerFn(createAdminUser);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("notary");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await addUser({ data: { email: newEmail, password: newPassword } });
      if (res.ok) {
        setNotice(res.message);
        setNewEmail("");
        setNewPassword("");
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that account.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    await router.navigate({ to: "/admin/login", replace: true });
  }


  return (
    <>
      <PageHero
        eyebrow="Private"
        title={<>Admin <span className="italic font-light text-gradient-gold">area.</span></>}
        intro="Welcome to the Enliven Notary admin area"
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe max-w-2xl">
          <div className="rounded-3xl border border-border bg-card p-8">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="text-foreground font-medium">{user?.email}</span>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to="/admin" className="btn-gold rounded-full px-6 py-3 text-sm font-medium">
                Appointment requests
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-border bg-card p-8">
            <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
              <UserPlus className="h-5 w-5 text-gold" /> Add user
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create an account for a team member. Give them the temporary password and ask them to change it after signing in.
            </p>

            <form onSubmit={onAddUser} className="mt-6">
              <label htmlFor="new-email" className="text-sm font-medium">Email</label>
              <div className="mt-2 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="new-email"
                  type="email"
                  required
                  autoComplete="off"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                />
              </div>

              <label htmlFor="new-password" className="mt-6 block text-sm font-medium">Temporary password</label>
              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="new-password"
                  type="text"
                  required
                  minLength={8}
                  autoComplete="off"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                />
              </div>

              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
              {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}

              <button
                type="submit"
                disabled={busy || !newEmail || newPassword.length < 8}
                className="btn-gold mt-6 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create account"}
              </button>
            </form>
          </div>
        </div>

      </section>
    </>
  );
}
