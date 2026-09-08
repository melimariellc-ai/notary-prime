import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";
import { listAuditLog, type AuditTable } from "@/lib/audit.functions";
import { CardHeader } from "@/components/admin/ui/Card";
import { Badge } from "@/components/admin/ui/Badge";

const FIELD_LABELS: Record<string, string> = {
  business_name: "Business name",
  contact_person: "Contact person",
  contact_type: "Contact type",
  pipeline_stage: "Pipeline stage",
  phone: "Phone",
  email: "Email",
  first_contacted_date: "First contacted",
  next_follow_up_date: "Next follow-up",
  referral_source: "Referral source",
  assigned_notary_id: "Assigned notary",
  referred_by: "Referred by",
  fee_amount: "Job amount",
  sms_status: "SMS status",
  sms_error: "SMS error",
  sms_sent_at: "SMS sent at",
  preferred_date: "Preferred date",
  preferred_time: "Preferred time",
  meeting_type: "Meeting type",
  notes: "Notes",
};

function label(field: string | null) {
  if (!field) return "Record";
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

function value(v: string | null) {
  if (v === null || v === "") return "empty";
  return v.length > 120 ? `${v.slice(0, 120)}…` : v;
}

function when(iso: string) {
  return new Date(iso).toLocaleString();
}

export function AuditTrail({ table, recordId }: { table: AuditTable; recordId: string }) {
  const fetchLog = useServerFn(listAuditLog);
  const { data, isPending } = useQuery({
    queryKey: ["audit-log", table, recordId],
    queryFn: () => fetchLog({ data: { table, recordId } }),
  });

  const entries = data?.entries ?? [];

  return (
    <div>
      <CardHeader
        title="Change history"
        icon={History}
        meta={!isPending && <span className="text-sm text-muted-foreground">({entries.length})</span>}
      />
      <p className="mt-1 text-sm text-muted-foreground">
        Every edit to this record's data, captured automatically — separate from the interaction log above.
      </p>

      {isPending ? (
        <div className="mt-6 grid gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-4 rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          No data changes recorded yet.
        </p>
      ) : (
        <ol className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Badge tone="accent">
                  {e.action === "updated" ? label(e.field_name) : e.action === "created" ? "Record created" : "Record deleted"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {when(e.changed_at)}
                  {e.changed_by_email ? ` · ${e.changed_by_email}` : " · system"}
                </span>
              </div>
              {e.action === "updated" && (
                <p className="mt-2 text-sm leading-relaxed">
                  <span className="text-muted-foreground line-through">{value(e.old_value)}</span>
                  <span aria-hidden="true" className="mx-2 text-accent-foreground">
                    →
                  </span>
                  <span className="font-medium">{value(e.new_value)}</span>
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
