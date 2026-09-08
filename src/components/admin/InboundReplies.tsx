import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, MailOpen } from "lucide-react";
import { listInboundReplies } from "@/lib/inbound.functions";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { Badge } from "@/components/admin/ui/Badge";


function when(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function InboundRepliesCard() {
  const fetchReplies = useServerFn(listInboundReplies);
  const { data, isLoading } = useQuery({ queryKey: ["inbound-replies"], queryFn: () => fetchReplies() });
  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader title="Replies received" icon={Inbox} />


      {isLoading ? (
        <ul className="mt-6 grid gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
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
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          No replies yet. When someone answers an outreach or booking email, it appears here and on their contact
          timeline.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {items.map((item) => {
            const body = (
              <>
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
                  <MailOpen className="h-3.5 w-3.5 text-accent-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-medium">
                      {item.business_name ?? item.from_name ?? item.from_email}
                    </span>
                    <span className="text-xs text-muted-foreground">· {when(item.received_at)}</span>
                    {!item.contact_id && (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        no matching contact
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm">{item.subject ?? "(no subject)"}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.snippet}</p>
                </div>
              </>
            );

            return (
              <li key={item.id} className="first:-mt-2 last:-mb-2">
                {item.contact_id ? (
                  <Link
                    to="/admin/crm/$contactId"
                    params={{ contactId: item.contact_id }}
                    className="-mx-3 flex gap-3 rounded-2xl px-3 py-4 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    {body}
                  </Link>
                ) : (
                  <a
                    href={`mailto:${item.from_email}`}
                    className="-mx-3 flex gap-3 rounded-2xl px-3 py-4 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    {body}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
