import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { CustomFieldsTab } from "@/components/admin/CustomFieldsTab";
import { CrmOptionsTab } from "@/components/admin/CrmOptionsTab";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { BusinessProfileTab } from "@/components/admin/BusinessProfileTab";
import { EmailTemplatesTab } from "@/components/admin/EmailTemplatesTab";
import { NotificationPreferencesTab } from "@/components/admin/NotificationPreferencesTab";

import { listFieldDefs } from "@/lib/fields.functions";
import { listCrmOptionUsage } from "@/lib/options.functions";

export const Route = createFileRoute("/admin/_protected/settings")({
  loader: async () => {
    const [fields, options] = await Promise.all([listFieldDefs(), listCrmOptionUsage()]);
    return { defs: fields.defs, ...options };
  },
  head: () => ({
    meta: [
      { title: "Settings | Enliven Notary" },
      {
        name: "description",
        content: "Manage custom contact fields, contact types, and pipeline stages for Enliven Notary.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Settings | Enliven Notary" },
      { property: "og:description", content: "Private admin settings for the Enliven Notary CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

const TABS = [
  { id: "fields", label: "Custom Fields" },
  { id: "types", label: "Contact Types" },
  { id: "stages", label: "Pipeline Stages" },
  { id: "users", label: "User Management" },
  { id: "business", label: "Business Profile" },
  { id: "emails", label: "Email Templates" },
  { id: "notifications", label: "Notification Preferences" },
] as const;


type TabId = (typeof TABS)[number]["id"];

function SettingsPage() {
  const { defs, contactTypes, pipelineStages } = Route.useLoaderData();
  const [tab, setTab] = useState<TabId>("fields");

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={
          <>
            CRM <span className="italic font-light text-gradient-gold">settings.</span>
          </>
        }
        intro="Shape the CRM around how you work: add your own contact fields, manage the contact types and pipeline stages available on every contact, and look after your team's accounts."
      />

      <AdminSection>
        <div
          role="tablist"
          aria-label="Settings sections"
          className="mb-8 flex flex-wrap gap-2 rounded-full border border-border bg-card p-1.5"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "fields" && <CustomFieldsTab defs={defs} />}
          {tab === "types" && (
            <CrmOptionsTab
              kind="contact_type"
              rows={contactTypes}
              heading="Contact types"
              addHeading="Add a contact type"
              placeholder="Estate Planning Attorney"
              intro="These are the choices in the Contact Type dropdown, in the order shown here."
              noun="Contact type"
            />
          )}
          {tab === "stages" && (
            <CrmOptionsTab
              kind="pipeline_stage"
              rows={pipelineStages}
              heading="Pipeline stages"
              addHeading="Add a pipeline stage"
              placeholder="Proposal Sent"
              intro="Stages appear in this order across the pipeline board, filters, and reports."
              noun="Pipeline stage"
            />
          )}
          {tab === "users" && <UserManagementTab />}
          {tab === "business" && <BusinessProfileTab />}
          {tab === "emails" && <EmailTemplatesTab />}
          {tab === "notifications" && <NotificationPreferencesTab />}

        </div>
      </AdminSection>
    </>
  );
}
