import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, UserPlus, Users } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { CrmOverview, CrmOverviewSkeleton } from "@/components/admin/CrmOverview";
import { FollowUpCalendar } from "@/components/admin/FollowUpCalendar";
import { Card, CardHeader, CARD_CLASS } from "@/components/admin/ui/Card";

import { RecentActivityCard } from "@/components/admin/RecentActivity";
import { InboundRepliesCard } from "@/components/admin/InboundReplies";

import { listBusinessContacts } from "@/lib/crm.functions";
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
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function DashboardPage() {
  const user = Route.useRouteContext().user;
  const fetchRole = useServerFn(getMyRole);
  const { data: me, isLoading: roleLoading } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole({}) });
  const role = me?.role ?? null;
  const isAdmin = me?.isAdmin ?? false;
  const canCrm = isAdmin || role === "employee";

  const fetchContacts = useServerFn(listBusinessContacts);
  const { data: crm, isLoading: crmLoading } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: () => fetchContacts(),
    enabled: canCrm,
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title={
          <>
            Admin <span className="italic font-light text-gradient-gold">overview.</span>
          </>
        }
        intro={
          <>
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            {role ? ` · ${role.charAt(0).toUpperCase()}${role.slice(1)} account` : ""}
          </>
        }
      />

      <AdminSection className="grid gap-6">
        {canCrm ? (
          crmLoading ? (
            <CrmOverviewSkeleton />
          ) : (
            <>
              <CrmOverview contacts={crm?.contacts ?? []} today={todayISO()} />
              <FollowUpCalendar contacts={crm?.contacts ?? []} today={todayISO()} />
            </>
          )
        ) : roleLoading ? (
          <CrmOverviewSkeleton />
        ) : (
          <Card>
            <CardHeader title="Your assignments" />
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Open Appointment Requests to see the appointments assigned to you.
            </p>
          </Card>
        )}



        <div className="grid gap-6 lg:grid-cols-3">
          {canCrm && (
            <div className="grid gap-6 lg:col-span-2">
              <RecentActivityCard />
              <InboundRepliesCard />
            </div>
          )}


          <div className="grid gap-4">
            <QuickLink
              to="/admin"
              icon={CalendarClock}
              title="Appointment requests"
              body="Review new bookings, assign a notary, and track referral sources."
            />
            {canCrm && (
              <QuickLink
                to="/admin/crm"
                icon={Users}
                title="Business development"
                body="Pipeline, follow-ups due, and referral value by contact."
              />
            )}
            {isAdmin && (
              <QuickLink
                to="/admin/users"
                icon={UserPlus}
                title="Add user"
                body="Invite a notary, employee, or admin with a secure password link."
              />
            )}
          </div>
        </div>
      </AdminSection>
    </>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className={`${CARD_CLASS} md:p-6 block transition-colors hover:border-gold/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60`}
    >
      <Icon className="h-5 w-5 text-accent-foreground" />
      <h2 className="mt-3 font-display text-xl leading-tight tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </Link>
  );
}

