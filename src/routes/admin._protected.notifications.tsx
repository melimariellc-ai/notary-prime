import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { NotificationPreferencesTab } from "@/components/admin/NotificationPreferencesTab";

export const Route = createFileRoute("/admin/_protected/notifications")({
  head: () => ({
    meta: [
      { title: "My Notification Preferences | Enliven Notary" },
      {
        name: "description",
        content: "Choose which Enliven Notary emails you personally receive.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "My Notification Preferences | Enliven Notary" },
      { property: "og:description", content: "Personal email notification settings for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

function NotificationsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="My account"
        title={
          <>
            My notification <span className="italic font-light text-gradient-gold">preferences.</span>
          </>
        }
        intro="These settings are personal to your account — they only change the emails sent to you."
      />
      <AdminSection>
        <NotificationPreferencesTab />
      </AdminSection>
    </>
  );
}
