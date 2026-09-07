import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CONTACT_TYPES, PIPELINE_STAGES, type ContactType, type PipelineStage } from "@/lib/crm.functions";

export const REPORT_DATASETS = ["contacts", "activities"] as const;
export type ReportDataset = (typeof REPORT_DATASETS)[number];

export type ReportResult = {
  headers: string[];
  rows: string[][];
  total: number;
  truncated: boolean;
};

const MAX_ROWS = 5000;

const CONTACT_HEADERS = [
  "Business name",
  "Contact person",
  "Contact type",
  "Pipeline stage",
  "Phone",
  "Email",
  "First contacted",
  "Next follow-up",
  "Referral source",
  "Created",
];

const ACTIVITY_HEADERS = [
  "Date",
  "Business name",
  "Contact type",
  "Pipeline stage",
  "Activity type",
  "Description",
];

function isoDate(value: unknown, label: string): string {
  const s = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Choose a valid ${label} date.`);
  return s;
}

function oneOf(value: unknown, allowed: readonly string[]): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (!allowed.includes(s)) throw new Error("Unknown filter value.");
  return s;
}

function day(value: unknown): string {
  return String(value ?? "").slice(0, 10);
}

export const runReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { dataset: string; from: string; to: string; stage?: string; type?: string }) => {
    const dataset = REPORT_DATASETS.includes(data?.dataset as ReportDataset)
      ? (data.dataset as ReportDataset)
      : "contacts";
    const from = isoDate(data?.from, "start");
    const to = isoDate(data?.to, "end");
    if (from > to) throw new Error("The start date must come before the end date.");
    return {
      dataset,
      from,
      to,
      stage: oneOf(data?.stage, PIPELINE_STAGES),
      type: oneOf(data?.type, CONTACT_TYPES),
    };
  })
  .handler(async ({ data, context }): Promise<ReportResult> => {
    const { supabase } = context;

    if (data.dataset === "contacts") {
      let q = supabase
        .from("business_contacts")
        .select(
          "business_name, contact_person, contact_type, pipeline_stage, phone, email, first_contacted_date, next_follow_up_date, referral_source, created_at",
        )
        .gte("created_at", `${data.from}T00:00:00Z`)
        .lte("created_at", `${data.to}T23:59:59Z`)
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS + 1);
      if (data.stage) q = q.eq("pipeline_stage", data.stage as PipelineStage);
      if (data.type) q = q.eq("contact_type", data.type as ContactType);

      const { data: rows, error } = await q;
      if (error) {
        console.error("Contacts report failed", error);
        throw new Error("Could not build that report.");
      }
      const list = rows ?? [];
      const truncated = list.length > MAX_ROWS;
      const kept = truncated ? list.slice(0, MAX_ROWS) : list;
      return {
        headers: CONTACT_HEADERS,
        total: kept.length,
        truncated,
        rows: kept.map((c) => [
          String(c.business_name ?? ""),
          String(c.contact_person ?? ""),
          String(c.contact_type ?? ""),
          String(c.pipeline_stage ?? ""),
          String(c.phone ?? ""),
          String(c.email ?? ""),
          String(c.first_contacted_date ?? ""),
          String(c.next_follow_up_date ?? ""),
          String(c.referral_source ?? ""),
          day(c.created_at),
        ]),
      };
    }

    let q = supabase
      .from("contact_activities")
      .select(
        "activity_date, activity_type, description, business_contacts!inner(business_name, contact_type, pipeline_stage)",
      )
      .gte("activity_date", data.from)
      .lte("activity_date", data.to)
      .order("activity_date", { ascending: false })
      .limit(MAX_ROWS + 1);
    if (data.stage) q = q.eq("business_contacts.pipeline_stage" as never, data.stage as never);
    if (data.type) q = q.eq("business_contacts.contact_type" as never, data.type as never);

    const { data: rows, error } = await q;
    if (error) {
      console.error("Activities report failed", error);
      throw new Error("Could not build that report.");
    }
    const list = (rows ?? []) as unknown as {
      activity_date: string;
      activity_type: string;
      description: string;
      business_contacts: { business_name: string; contact_type: string; pipeline_stage: string } | null;
    }[];
    const truncated = list.length > MAX_ROWS;
    const kept = truncated ? list.slice(0, MAX_ROWS) : list;
    return {
      headers: ACTIVITY_HEADERS,
      total: kept.length,
      truncated,
      rows: kept.map((a) => [
        String(a.activity_date ?? ""),
        String(a.business_contacts?.business_name ?? ""),
        String(a.business_contacts?.contact_type ?? ""),
        String(a.business_contacts?.pipeline_stage ?? ""),
        String(a.activity_type ?? ""),
        String(a.description ?? ""),
      ]),
    };
  });
