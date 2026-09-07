import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, UserPlus, Users } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { getMyRole } from "@/lib/users.functions";

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
  errorComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">
      Something went wrong. Please refresh.
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">Page not found.</div>
  ),
});

function DashboardPage() {
  const user = Route.useRouteContext().user;
  const fetchRole = useServerFn(getMyRole);
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole({}) });
  const role = me?.role ?? null;
  const isAdmin = me?.isAdmin ?? false;
  const canCrm = isAdmin || role === "employee";

  return (
    <>
      <PageHero
        eyebrow="Private"
        title={<>Admin <span className="italic font-light text-gradient-gold">overview.</span></>}
        intro="Welcome to the Enliven Notary admin area."
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe max-w-4xl">
          <div className="rounded-3xl border border-border bg-card p-8">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="text-foreground font-medium">{user?.email}</span>
              {role && (
                <span className="ml-2 text-xs uppercase tracking-[0.18em] text-gold">· {role}</span>
              )}
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Link
              to="/admin"
              className="rounded-3xl border border-border bg-card p-8 transition-colors hover:border-gold/50"
            >
              <CalendarClock className="h-5 w-5 text-gold" />
              <h2 className="mt-4 font-display text-2xl tracking-tight">Appointment requests</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Review new bookings, assign a notary, and track referral sources.
              </p>
            </Link>

            {canCrm && (
              <Link
                to="/admin/crm"
                className="rounded-3xl border border-border bg-card p-8 transition-colors hover:border-gold/50"
              >
                <Users className="h-5 w-5 text-gold" />
                <h2 className="mt-4 font-display text-2xl tracking-tight">Business development</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pipeline, follow-ups due, and referral value by contact.
                </p>
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin/users"
                className="rounded-3xl border border-border bg-card p-8 transition-colors hover:border-gold/50"
              >
                <UserPlus className="h-5 w-5 text-gold" />
                <h2 className="mt-4 font-display text-2xl tracking-tight">Add user</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Invite a notary, employee, or admin with a secure password link.
                </p>
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
