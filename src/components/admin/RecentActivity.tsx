import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Mail, MessageSquare, Phone, StickyNote, Users } from "lucide-react";
import { listRecentActivity } from "@/lib/crm.functions";

const ICONS: Record<string, typeof Mail> = {
  Email: Mail,
  Call: Phone,
  Meeting: Users,
  Note: StickyNote,
};

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function ActivityDescription({ description }: { description: string }) {
  const match = description.match(/^(Subject:\s*([^\n]+)|Reply received:\s*([^\n]+))(?:\n+([\s\S]+))?$/);
  if (!match) {
    return <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{description}</p>;
  }

  const subject = (match[2] ?? match[3] ?? "").trim();
  const body = match[4]?.trim() ?? "";
  const isReply = description.startsWith("Reply received:");

  return (
    <div className="mt-2 text-sm leading-relaxed">
      <p>
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {isReply ? "Reply · Subject" : "Subject"}
        </span>
        <br />
        <span className="font-medium">{subject}</span>
      </p>
      {body && (
        <p className="mt-2 line-clamp-3 whitespace-pre-line border-t border-border pt-2 text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}

export function RecentActivityCard() {
  const fetchRecent = useServerFn(listRecentActivity);
  const { data, isLoading } = useQuery({ queryKey: ["recent-activity"], queryFn: () => fetchRecent() });
  const items = data?.items ?? [];

  return (
    <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
        <Activity className="h-5 w-5 text-accent-foreground" /> Recent activity
      </h2>

      {isLoading ? (
        <ul className="mt-6 grid gap-4" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing logged yet. Calls, emails, meetings, and notes appear here as your team records them.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5">
          {items.map((item) => {
            const Icon = ICONS[item.activity_type] ?? MessageSquare;
            return (
              <li key={item.id} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
                  <Icon className="h-3.5 w-3.5 text-accent-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-2 text-sm">
                    <Link
                      to="/admin/crm/$contactId"
                      params={{ contactId: item.contact_id }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {item.business_name}
                    </Link>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.activity_type}
                    </span>
                    <span className="text-xs text-muted-foreground">· {timeAgo(item.created_at)}</span>
                  </p>
                  <ActivityDescription description={item.description} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
