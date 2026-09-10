/**
 * Named "Send from" profiles for person-initiated email (outreach and Mail
 * Activity replies). Each profile sets the From and Reply-To pair together so
 * the two can never drift apart. Automated system email does not use these.
 */
export type SendProfileId = "outreach" | "reply_in_thread";

export const SEND_PROFILES: Record<
  SendProfileId,
  { id: SendProfileId; label: string; from: string; replyTo: string }
> = {
  outreach: {
    id: "outreach",
    label: "Outreach — tracked",
    from: "outreach@send.enlivennotary.com",
    replyTo: "replies@replies.enlivennotary.com",
  },
  reply_in_thread: {
    id: "reply_in_thread",
    label: "Reply-in-thread — tracked",
    from: "replies@replies.enlivennotary.com",
    replyTo: "replies@replies.enlivennotary.com",
  },
};

export const SEND_PROFILE_LIST = [SEND_PROFILES.outreach, SEND_PROFILES.reply_in_thread];

/** Falls back to the given default when an unknown id arrives. */
export function resolveSendProfile(id: unknown, fallback: SendProfileId) {
  return typeof id === "string" && id in SEND_PROFILES
    ? SEND_PROFILES[id as SendProfileId]
    : SEND_PROFILES[fallback];
}
