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

const TAB_GROUPS = [
  {
    label: "Data Configuration",
    items: [
      { id: "fields", label: "Custom Fields" },
      { id: "types", label: "Contact Types" },
      { id: "stages", label: "Pipeline Stages" },
    ],
  },
  {
    label: "Business & Team",
    items: [
      { id: "business", label: "Business Profile" },
      { id: "users", label: "User Management" },
    ],
  },
  {
    label: "Communications",
    items: [{ id: "emails", label: "Email Templates" }],
  },
] as const;

type TabId = (typeof TAB_GROUPS)[number]["items"][number]["id"];

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
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <div
            role="tablist"
            aria-label="Settings sections"
            aria-orientation="vertical"
            className="w-full shrink-0 space-y-6 lg:sticky lg:top-20 lg:w-64 lg:self-start"
          >
            {TAB_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      id={`tab-${t.id}`}
                      aria-selected={tab === t.id}
                      aria-controls={`panel-${t.id}`}
                      onClick={() => setTab(t.id)}
                      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                        tab === t.id
                          ? "bg-secondary text-foreground shadow-[inset_2px_0_0_0_hsl(var(--gold))]"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
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
          </div>
        </div>
      </AdminSection>
    </>
  );
}

