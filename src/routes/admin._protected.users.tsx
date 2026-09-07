import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Mail, Shield, UserPlus } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { createAdminUser, getMyRole } from "@/lib/users.functions";

export const Route = createFileRoute("/admin/_protected/users")({
  head: () => ({
    meta: [
      { title: "Add User | Enliven Notary Admin" },
      { name: "description", content: "Create team accounts for the Enliven Notary admin area." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Add User | Enliven Notary Admin" },
      { property: "og:description", content: "Create team accounts for the Enliven Notary admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
  errorComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">
      Something went wrong. Please refresh.
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">Page not found.</div>
  ),
});

function UsersPage() {
  const fetchRole = useServerFn(getMyRole);
  const { data: me, isLoading } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole({}) });
  const isAdmin = me?.isAdmin ?? false;
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
      const res = await addUser({ data: { name: newName, email: newEmail, role: newRole } });
      if (res.ok) {
        setNotice(res.message);
        setNewName("");
        setNewEmail("");
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Team"
        title={<>Add <span className="italic font-light text-gradient-gold">user.</span></>}
        intro="Create an account for a team member. They'll receive a welcome email with a secure link to set their own password."
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe max-w-2xl">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Checking your permissions…</p>
          ) : !isAdmin ? (
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-sm text-muted-foreground">
                Only Admin accounts can create new users.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-8">
              <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
                <UserPlus className="h-5 w-5 text-gold" /> New account
              </h2>

              <form onSubmit={onAddUser} className="mt-6">
                <label htmlFor="new-name" className="text-sm font-medium">Name</label>
                <div className="mt-2 relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="new-name"
                    type="text"
                    required
                    autoComplete="off"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                  />
                </div>

                <label htmlFor="new-email" className="mt-6 block text-sm font-medium">Email</label>
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

                <label htmlFor="new-role" className="mt-6 block text-sm font-medium">Role</label>
                <div className="mt-2 relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    id="new-role"
                    required
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                  >
                    <option value="notary">Notary</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}

                <button
                  type="submit"
                  disabled={busy || !newName || !newEmail}
                  className="btn-gold mt-6 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
                >
                  {busy ? "Creating…" : "Create account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
