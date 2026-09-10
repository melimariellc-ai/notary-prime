import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Card, CardHeader, SectionLabel } from "@/components/admin/ui/Card";
import { getSiteChatEngagement } from "@/lib/site-chat.functions";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl tracking-tight md:text-4xl">{value}</p>
      <SectionLabel className="mt-2">{label}</SectionLabel>
    </div>
  );
}

export function SiteChatEngagementCard() {
  const fetchStats = useServerFn(getSiteChatEngagement);
  const { data, isLoading } = useQuery({
    queryKey: ["site-chat-engagement"],
    queryFn: () => fetchStats(),
    staleTime: 60 * 1000,
  });

  return (
    <Card>
      <CardHeader title="Website chat" meta={<SectionLabel>Last 30 days</SectionLabel>} />
      {isLoading ? (
        <div className="mt-6 h-16 animate-pulse rounded-lg bg-muted" />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat value={data?.opened ?? 0} label="Chats opened" />
            <Stat value={data?.conversations ?? 0} label="Conversations started" />
            <Stat value={data?.opened7 ?? 0} label="Opened, last 7 days" />
            <Stat value={data?.conversations7 ?? 0} label="Started, last 7 days" />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Each visitor is counted once per visit — “opened” means they clicked the chat bubble, and
            “started” means they actually sent a message.
          </p>
        </>
      )}
    </Card>
  );
}
