import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import { useCrmOptions } from "@/hooks/useCrmOptions";
import { runReport, type ReportDataset, type ReportResult } from "@/lib/reports.functions";

export const Route = createFileRoute("/admin/_protected/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Enliven Notary" },
      { name: "description", content: "Export Enliven Notary CRM contacts and activities as CSV." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Reports | Enliven Notary" },
      { property: "og:description", content: "Private CRM reporting and CSV export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthsAgoISO(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCsv(name: string, headers: string[], rows: string[][]) {
  const body = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const build = useServerFn(runReport);

  const [dataset, setDataset] = useState<ReportDataset>("contacts");
  const [from, setFrom] = useState(monthsAgoISO(3));
  const [to, setTo] = useState(todayISO());
  const [stage, setStage] = useState("");
  const [type, setType] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);

  async function preview() {
    setBusy(true);
    try {
      const res = await build({ data: { dataset, from, to, stage, type } });
      setResult(res);
      if (res.total === 0) toast.info("No records match those filters.");
      else toast.success(`${res.total} record${res.total === 1 ? "" : "s"} ready.`);
    } catch (err) {
      setResult(null);
      toast.error(err instanceof Error ? err.message : "Could not build that report.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!result || result.total === 0) return;
    downloadCsv(`enliven-${dataset}-${from}-to-${to}.csv`, result.headers, result.rows);
    toast.success("CSV downloaded.");
  }

  const previewRows = result?.rows.slice(0, 25) ?? [];

  return (
    <>
      <AdminPageHeader
        eyebrow="Work"
        title={
          <>
            Reports & <span className="italic font-light text-gradient-gold">exports.</span>
          </>
        }
        intro="Pull contacts or logged activities for any date range, narrow by stage or contact type, check the preview, then download a spreadsheet."
      />

      <AdminSection>
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="dataset" className="text-sm text-muted-foreground">
                Report
              </label>
              <select
                id="dataset"
                value={dataset}
                onChange={(e) => {
                  setDataset(e.target.value as ReportDataset);
                  setResult(null);
                }}
                className={`mt-2 ${inputClass}`}
              >
                <option value="contacts">Contacts</option>
                <option value="activities">Activities</option>
              </select>
            </div>
            <div>
              <label htmlFor="from" className="text-sm text-muted-foreground">
                From
              </label>
              <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`mt-2 ${inputClass}`} />
            </div>
            <div>
              <label htmlFor="to" className="text-sm text-muted-foreground">
                To
              </label>
              <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`mt-2 ${inputClass}`} />
            </div>
            <div>
              <label htmlFor="stage" className="text-sm text-muted-foreground">
                Pipeline stage
              </label>
              <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)} className={`mt-2 ${inputClass}`}>
                <option value="">All stages</option>
                {pipelineStages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="type" className="text-sm text-muted-foreground">
                Contact type
              </label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value)} className={`mt-2 ${inputClass}`}>
                <option value="">All types</option>
                {contactTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void preview()}
              disabled={busy}
              className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" /> {busy ? "Building…" : "Preview report"}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!result || result.total === 0}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-accent-foreground" /> Export CSV
            </button>
            <span className="text-xs text-muted-foreground">
              {dataset === "contacts"
                ? "Contacts are filtered by the date they were added."
                : "Activities are filtered by the date they happened."}
            </span>
          </div>
        </div>

        {result && (
          <div className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl tracking-tight">Preview</h2>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {result.total} record{result.total === 1 ? "" : "s"} match
                {result.total === 1 ? "es" : ""} · showing first {Math.min(25, result.total)}
                {result.truncated ? " · capped at 5,000 rows" : ""}
              </p>
            </div>

            {result.total === 0 ? (
              <p className="mt-4 rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
                Nothing to export for that date range. Try widening the dates or clearing a filter.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-3xl border border-border bg-card">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="border-b border-border bg-secondary/60">
                    <tr>
                      {result.headers.map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-3 text-muted-foreground">
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </AdminSection>
    </>
  );
}
