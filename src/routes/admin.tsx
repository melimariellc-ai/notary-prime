import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock, LogOut, Mail, MapPin, Phone, Video } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { getAppointments, lockAdmin, unlockAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Appointments Admin | Enliven Notary" },
      { name: "description", content: "Private dashboard for reviewing Enliven Notary appointment requests." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Appointments Admin | Enliven Notary" },
      { property: "og:description", content: "Private appointment dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => getAppointments(),
  component: AdminPage,
  errorComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">
      Something went wrong loading appointments. Please refresh.
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-luxe py-32 text-center text-muted-foreground">Page not found.</div>
  ),
});

function AdminPage() {
  const { locked, appointments } = Route.useLoaderData();
  const router = useRouter();
  const unlock = useServerFn(unlockAdmin);
  const lock = useServerFn(lockAdmin);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await unlock({ data: { passcode } });
      if (res.ok) {
        setPasscode("");
        await router.invalidate();
      } else {
        setError(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (locked) {
    return (
      <>
        <PageHero
          eyebrow="Private"
          title={<>Appointments <span className="italic font-light text-gradient-gold">dashboard.</span></>}
          intro="Enter your passcode to view booking requests."
          cta={false}
        />
        <section className="pb-24">
          <div className="container-luxe max-w-md">
            <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-8">
              <label htmlFor="passcode" className="text-sm font-medium">Passcode</label>
              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="passcode"
                  type="password"
                  autoComplete="current-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
                />
              </div>
              {error && <p className="mt-3 text-sm text-destructive">Incorrect passcode.</p>}
              <button
                type="submit"
                disabled={busy || !passcode}
                className="btn-gold mt-6 w-full rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
              >
                {busy ? "Checking…" : "Unlock"}
              </button>
            </form>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Private"
        title={<>Appointment <span className="italic font-light text-gradient-gold">requests.</span></>}
        intro={`${appointments.length} request${appointments.length === 1 ? "" : "s"} received, newest first.`}
        cta={false}
      />
      <section className="pb-24">
        <div className="container-luxe">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={async () => {
                await lock({});
                await router.invalidate();
              }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Lock dashboard
            </button>
          </div>

          {appointments.length === 0 ? (
            <p className="mt-8 rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
              No requests yet. New submissions from the Book page will appear here.
            </p>
          ) : (
            <div className="mt-8 grid gap-4">
              {appointments.map((a) => (
                <article key={a.id} className="rounded-3xl border border-border bg-card p-6 md:p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="font-display text-2xl tracking-tight">{a.name}</h2>
                    <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {new Date(a.submitted_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                    <p className="text-muted-foreground">
                      <span className="text-foreground font-medium">{a.service}</span>
                    </p>
                    <p className="inline-flex items-center gap-2 text-muted-foreground">
                      {a.meeting_type === "online" ? <Video className="h-4 w-4 text-gold" /> : <MapPin className="h-4 w-4 text-gold" />}
                      {a.meeting_type === "online" ? "Online — secure video" : a.address || "Mobile — address TBC"}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(`${a.preferred_date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      · {a.preferred_time}
                    </p>
                    <p className="flex flex-wrap items-center gap-4">
                      <a href={`tel:${a.phone}`} aria-label={`Call ${a.name} at ${a.phone}`} className="inline-flex items-center gap-1.5 hover:text-gold transition-colors">
                        <Phone className="h-4 w-4 text-gold" /> {a.phone}
                      </a>
                      <a href={`mailto:${a.email}`} aria-label={`Email ${a.name} at ${a.email}`} className="inline-flex items-center gap-1.5 hover:text-gold transition-colors">
                        <Mail className="h-4 w-4 text-gold" /> {a.email}
                      </a>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <SmsBadge status={a.sms_status} />
                    {a.sms_status === "sent" && a.sms_sent_at && (
                      <span className="text-muted-foreground">
                        Sent {new Date(a.sms_sent_at).toLocaleString()}
                      </span>
                    )}
                    {a.sms_error && (
                      <span className="text-muted-foreground break-all">{a.sms_error}</span>
                    )}
                  </div>

                  {a.notes && (
                    <p className="mt-4 rounded-xl border border-border p-4 text-sm text-muted-foreground leading-relaxed">
                      {a.notes}
                    </p>
                  )}
                </article>

              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
