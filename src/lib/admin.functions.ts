import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

const sessionConfig = {
  password: process.env["SESSION_SECRET"] ?? "development-only-session-secret-please-set-me",
  name: "enliven-admin",
  maxAge: 60 * 60 * 12,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

type AdminSession = { unlocked?: boolean };

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export type Appointment = {
  id: string;
  service: string;
  meeting_type: string;
  address: string | null;
  preferred_date: string;
  preferred_time: string;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  submitted_at: string;
};

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { passcode: string }) => ({ passcode: String(data.passcode ?? "") }))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSCODE"];
    if (!expected) return { ok: false as const };
    if (!matches(data.passcode, expected)) return { ok: false as const };

    const session = await useSession<AdminSession>(sessionConfig);
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig);
  await session.clear();
  return { ok: true as const };
});

export const getAppointments = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig);
  if (!session.data.unlocked) return { locked: true as const, appointments: [] as Appointment[] };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("id, service, meeting_type, address, preferred_date, preferred_time, name, email, phone, notes, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Failed to load appointments", error);
    throw new Error("Could not load appointments.");
  }

  return { locked: false as const, appointments: (data ?? []) as Appointment[] };
});
