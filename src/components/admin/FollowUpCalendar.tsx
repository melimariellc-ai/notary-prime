import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, BellRing } from "lucide-react";
import type { BusinessContact } from "@/lib/crm.functions";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { ButtonLink } from "@/components/admin/ui/Button";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function FollowUpCalendar({ contacts, today }: { contacts: BusinessContact[]; today: string }) {
  const now = new Date(`${today}T00:00:00`);
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const byDate = useMemo(() => {
    const map = new Map<string, BusinessContact[]>();
    for (const c of contacts) {
      if (!c.next_follow_up_date) continue;
      const list = map.get(c.next_follow_up_date) ?? [];
      list.push(c);
      map.set(c.next_follow_up_date, list);
    }
    return map;
  }, [contacts]);

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const dueNow = contacts
    .filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today)
    .sort((a, b) => (a.next_follow_up_date! < b.next_follow_up_date! ? -1 : 1));

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <Card>
      <CardHeader
        title="Follow-up calendar"
        meta={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[9rem] text-center text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {dueNow.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <BellRing className="h-4 w-4" />
          {dueNow.length} follow-up{dueNow.length === 1 ? "" : "s"} due or overdue
          <ButtonLink
            to="/admin/dashboard"
            hash="needs-attention"
            variant="tertiary"
            size="sm"
            className="ml-auto text-destructive"
          >
            Review
          </ButtonLink>
        </div>
      )}

      <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">

        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} className="min-h-20 rounded-xl" />;
          const date = iso(view.year, view.month, day);
          const items = byDate.get(date) ?? [];
          const isToday = date === today;
          const overdue = items.length > 0 && date < today;
          return (
            <div
              key={date}
              className={`min-h-20 rounded-xl border p-1.5 text-left ${
                isToday ? "border-gold/70 bg-gold/5" : overdue ? "border-destructive/40 bg-destructive/5" : "border-border"
              }`}
            >
              <span
                className={`text-[0.7rem] ${isToday ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {day}
              </span>
              <div className="mt-1 grid gap-1">
                {items.slice(0, 2).map((c) => (
                  <Link
                    key={c.id}
                    to="/admin/crm/$contactId"
                    params={{ contactId: c.id }}
                    title={`${c.business_name} · ${c.pipeline_stage}`}
                    className={`block truncate rounded-md px-1.5 py-0.5 text-[0.65rem] transition-colors ${
                      date <= today
                        ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                        : "bg-secondary text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {c.business_name}
                  </Link>
                ))}
                {items.length > 2 && (
                  <span className="px-1.5 text-[0.6rem] text-muted-foreground">+{items.length - 2} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>

  );
}
