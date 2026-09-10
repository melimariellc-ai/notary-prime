import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type QuoEvent = {
  type?: string;
  data?: {
    object?: {
      direction?: string;
      from?: string;
      to?: string | string[];
      text?: string;
      body?: string;
      createdAt?: string;
    };
  };
};

/**
 * Inbound text messages from Quo (OpenPhone). When the sender matches a client
 * we sent a readiness check to, the message is logged on their CRM record.
 * Informational only — no appointment is changed here.
 */
export const Route = createFileRoute("/api/public/quo-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["QUO_WEBHOOK_SECRET"];
        const raw = await request.text();

        // Quo signs webhooks; when a secret is configured we require a match.
        if (secret) {
          const header = request.headers.get("openphone-signature") ?? request.headers.get("quo-signature") ?? "";
          const parts = header.split(";");
          const timestamp = parts[2] ?? "";
          const provided = parts[3] ?? "";
          const expected = createHmac("sha256", Buffer.from(secret, "base64"))
            .update(`${timestamp}.${raw}`)
            .digest("base64");
          const a = Buffer.from(provided);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let event: QuoEvent;
        try {
          event = JSON.parse(raw) as QuoEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const message = event.data?.object;
        if (!message || message.direction === "outgoing") {
          return Response.json({ ignored: true });
        }

        const from = String(message.from ?? "").trim();
        const body = String(message.text ?? message.body ?? "").trim();
        if (!from || !body) return Response.json({ ignored: true });

        const { logReadinessReply } = await import("@/lib/readiness-check.server");
        const logged = await logReadinessReply({ address: from, body, matchBy: "phone" });

        return Response.json({ ok: true, readinessReply: logged });
      },
    },
  },
});
