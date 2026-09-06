import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { supabase } from "@/integrations/supabase/client";

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
        </div>
      </section>
    </>
  );
}
