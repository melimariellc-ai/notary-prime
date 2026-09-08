import { Link } from "@tanstack/react-router";
import { type BusinessContact } from "@/lib/crm.functions";
import { stageColor, useCrmOptions } from "@/hooks/useCrmOptions";
import { Card, CardHeader, SectionLabel, CARD_CLASS } from "@/components/admin/ui/Card";
import { Badge } from "@/components/admin/ui/Badge";



function StatCard({
  value,
  label,
  accent,
  stage,
  hash,
}: {
  value: number;
  label: string;
  accent?: boolean;
  stage?: string;
  hash?: string;
}) {
  const inner = (
    <>
      <p
        className={`font-display text-4xl tracking-tight md:text-5xl ${accent && value > 0 ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </p>
      <SectionLabel className="mt-2">{label}</SectionLabel>
    </>
  );
  const className = `${CARD_CLASS} block md:p-6 transition-colors hover:border-gold/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60`;

  if (hash) {
    return (
      <Link
        to="/admin/dashboard"
        hash={hash}
        aria-label={`${label}: ${value}. View details.`}
        className={className}
      >
        {inner}
      </Link>
    );
  }
  return (
    <Link
      to="/admin/crm"
      search={stage ? { stage } : {}}
      aria-label={`${label}: ${value}. View contacts.`}
      className={className}
    >
      {inner}
    </Link>
  );
}



type StageCount = { stage: string; count: number; color: string };

function Donut({ counts, total }: { counts: StageCount[]; total: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="group" aria-label="Pipeline stage mix">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--color-muted)" strokeWidth="20" />
        {total > 0 &&
          counts.map(({ stage, count, color }) => {
            if (count === 0) return null;
            const length = (count / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            const el = (
              <Link
                key={stage}
                to="/admin/crm"
                search={{ stage }}
                aria-label={`${stage}: ${count} contacts. View filtered list.`}
                className="cursor-pointer outline-none [&>circle]:transition-[stroke-width,opacity] [&>circle]:hover:stroke-[26] focus-visible:[&>circle]:stroke-[26]"
              >
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="20"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              </Link>
            );
            offset += length;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl tracking-tight">{total}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Contacts</span>
      </div>
    </div>
  );
}

export function CrmOverviewSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading pipeline overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="md:p-6">
            <div className="h-10 w-16 animate-pulse rounded-lg bg-muted" />
            <div className="mt-3 h-3 w-28 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-6 grid gap-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-6 h-52 w-52 animate-pulse rounded-full bg-muted" />
        </Card>
      </div>
    </div>
  );
}


export function CrmOverview({ contacts, today }: { contacts: BusinessContact[]; today: string }) {
  const { pipelineStages } = useCrmOptions();
  const counts: StageCount[] = pipelineStages.map((stage) => ({
    stage,
    count: contacts.filter((c) => c.pipeline_stage === stage).length,
    color: stageColor(stage, pipelineStages),
  }));
  const total = contacts.length;
  const max = Math.max(1, ...counts.map((c) => c.count));
  const due = contacts
    .filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today)
    .sort((a, b) => (a.next_follow_up_date! < b.next_follow_up_date! ? -1 : 1));
  const find = (stage: string) => counts.find((c) => c.stage === stage)?.count ?? 0;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={total} label="Total contacts" />
        <StatCard value={find("New Lead")} label="New leads" stage="New Lead" />
        <StatCard value={due.length} label="Overdue follow-ups" accent hash="needs-attention" />
        <StatCard
          value={find("Active Referral Source")}
          label="Active referral sources"
          stage="Active Referral Source"
        />

      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pipeline breakdown" />
          <div className="mt-6 grid gap-2">
            {counts.map(({ stage, count, color }) => (
              <Link
                key={stage}
                to="/admin/crm"
                search={{ stage }}
                aria-label={`View ${count} contacts in ${stage}`}
                className="group -mx-3 rounded-2xl px-3 py-2 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <div className="flex items-baseline justify-between text-sm">
                  <span className="transition-colors group-hover:text-accent-foreground">{stage}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${Math.round((count / max) * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Stage mix" />
          <div className="mt-6">
            <Donut counts={counts} total={total} />
          </div>
          <ul className="mt-6 grid gap-2 text-xs">
            {counts.map(({ stage, count, color }) => (
              <li key={stage}>
                <Link
                  to="/admin/crm"
                  search={{ stage }}
                  className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex-1 truncate text-foreground">{stage}</span>
                  <span>{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card id="needs-attention" className="scroll-mt-20">
        <CardHeader
          title="Needs attention"
          meta={<SectionLabel>{due.length} due or overdue</SectionLabel>}
        />
        {due.length === 0 ? (
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Nothing due. Contacts appear here once their next follow-up date arrives.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border">
            {due.map((c) => (
              <li key={c.id}>
                <Link
                  to="/admin/crm/$contactId"
                  params={{ contactId: c.id }}
                  className="group -mx-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-4 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-lg tracking-tight transition-colors group-hover:text-accent-foreground">
                      {c.business_name}
                    </span>
                    <Badge dotColor={stageColor(c.pipeline_stage, pipelineStages)}>
                      {c.pipeline_stage}
                    </Badge>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {new Date(`${c.next_follow_up_date}T00:00:00`).toLocaleDateString()}
                    {c.next_follow_up_date! < today && <Badge tone="critical">Overdue</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

    </div>
  );
}
