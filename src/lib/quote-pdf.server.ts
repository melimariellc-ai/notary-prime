import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { credentialsLine, usd, type BusinessProfile } from "./business-profile";
import type { QuoteLineItem } from "./quotes.functions";

export type QuotePdfInput = {
  profile: BusinessProfile;
  quote: {
    id: string;
    line_items: QuoteLineItem[];
    subtotal: number;
    total: number;
    status: string;
    notes: string | null;
    hosted_invoice_url: string | null;
    sent_at: string | null;
    created_at: string;
  };
  appointment: {
    name: string;
    email: string;
    phone: string | null;
    service: string;
    meeting_type: string | null;
    preferred_date: string | null;
    preferred_time: string | null;
    address: string | null;
  };
};

const GOLD = rgb(0.706, 0.569, 0.294);
const INK = rgb(0.106, 0.114, 0.129);
const MUTED = rgb(0.42, 0.44, 0.47);
const RULE = rgb(0.85, 0.86, 0.87);
const TINT = rgb(0.972, 0.968, 0.958);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [""];
}

/** Renders a branded, printable one-page quote. Pure JS so it runs in the edge runtime. */
export async function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const { profile, quote, appointment } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`Quote — ${profile.business_name}`);
  doc.setAuthor(profile.business_name);

  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed > MARGIN + 40) return;
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const text = (
    value: string,
    opts: { x?: number; size?: number; font?: PDFFont; color?: typeof INK } = {},
  ) => {
    page.drawText(value, {
      x: opts.x ?? MARGIN,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? body,
      color: opts.color ?? INK,
    });
  };

  const right = (value: string, size = 10, font: PDFFont = body, color = INK) => {
    const width = font.widthOfTextAtSize(value, size);
    page.drawText(value, { x: PAGE_W - MARGIN - width, y, size, font, color });
  };

  // ---- Header -------------------------------------------------------------
  text(profile.business_name, { size: 22, font: bold });
  right("QUOTE", 22, bold, GOLD);
  y -= 18;
  text("Mobile · Online · Trusted", { size: 8.5, font: italic, color: GOLD });
  y -= 16;

  const contactBits = [profile.phone, profile.email, profile.service_area].filter(Boolean);
  text(contactBits.join("  ·  "), { size: 9, color: MUTED });
  y -= 22;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.5, color: GOLD });
  y -= 24;

  // ---- Meta ---------------------------------------------------------------
  const meta: [string, string][] = [
    ["Quote number", quote.id.slice(0, 8).toUpperCase()],
    ["Date issued", formatDate(quote.sent_at ?? quote.created_at)],
    ["Status", quote.status.charAt(0).toUpperCase() + quote.status.slice(1)],
  ];
  for (const [label, value] of meta) {
    text(label, { size: 9, color: MUTED });
    right(value, 9.5, bold);
    y -= 15;
  }
  y -= 12;

  // ---- Prepared for -------------------------------------------------------
  const sectionHeading = (label: string) => {
    ensure(60);
    text(label.toUpperCase(), { size: 8.5, font: bold, color: GOLD });
    y -= 15;
  };

  sectionHeading("Prepared for");
  text(appointment.name, { size: 12, font: bold });
  y -= 14;
  const clientLine = [appointment.email, appointment.phone].filter(Boolean).join("  ·  ");
  if (clientLine) {
    text(clientLine, { size: 9.5, color: MUTED });
    y -= 20;
  } else {
    y -= 6;
  }

  // ---- Appointment details ------------------------------------------------
  const details: [string, string][] = [
    ["Service", appointment.service || "—"],
    ["Appointment type", appointment.meeting_type || "—"],
    [
      "Requested",
      appointment.preferred_date
        ? `${formatDate(appointment.preferred_date)}${appointment.preferred_time ? ` at ${appointment.preferred_time}` : ""}`
        : "—",
    ],
    ["Location", appointment.address || "—"],
  ];

  const detailLines = details.flatMap(([label, value]) =>
    wrap(value, body, 9.5, CONTENT_W - 130).map((line, i) => [i === 0 ? label : "", line] as [string, string]),
  );
  const boxHeight = detailLines.length * 15 + 22;
  ensure(boxHeight + 30);
  page.drawRectangle({ x: MARGIN, y: y - boxHeight, width: CONTENT_W, height: boxHeight, color: TINT });
  y -= 16;
  for (const [label, value] of detailLines) {
    if (label) text(label, { x: MARGIN + 14, size: 9, color: MUTED });
    text(value, { x: MARGIN + 130, size: 9.5 });
    y -= 15;
  }
  y -= 28;

  // ---- Line items ---------------------------------------------------------
  sectionHeading("Services quoted");
  const colQty = MARGIN + 300;
  const colUnit = MARGIN + 370;
  text("Description", { size: 8.5, font: bold, color: MUTED });
  text("Qty", { x: colQty, size: 8.5, font: bold, color: MUTED });
  text("Unit price", { x: colUnit, size: 8.5, font: bold, color: MUTED });
  right("Amount", 8.5, bold, MUTED);
  y -= 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75, color: RULE });
  y -= 16;

  for (const item of quote.line_items) {
    const lines = wrap(item.description, body, 10, 280);
    ensure(lines.length * 14 + 20);
    const rowTop = y;
    lines.forEach((line, i) => {
      text(line, { size: 10 });
      if (i < lines.length - 1) y -= 14;
    });
    const restore = y;
    y = rowTop;
    text(String(item.quantity), { x: colQty, size: 10 });
    text(usd(item.unit_price), { x: colUnit, size: 10 });
    right(usd(item.quantity * item.unit_price), 10, bold);
    y = restore - 12;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 0.5, color: RULE });
    y -= 14;
  }

  // ---- Totals -------------------------------------------------------------
  ensure(70);
  y -= 4;
  text("Subtotal", { x: colUnit, size: 9.5, color: MUTED });
  right(usd(quote.subtotal), 9.5);
  y -= 18;
  text("Total due", { x: colUnit, size: 12, font: bold });
  right(usd(quote.total), 13, bold, GOLD);
  y -= 30;

  // ---- Notes --------------------------------------------------------------
  if (quote.notes?.trim()) {
    sectionHeading("Notes");
    for (const line of wrap(quote.notes.trim(), body, 9.5, CONTENT_W)) {
      ensure(20);
      text(line, { size: 9.5 });
      y -= 14;
    }
    y -= 14;
  }

  // ---- Payment ------------------------------------------------------------
  if (quote.hosted_invoice_url) {
    sectionHeading("How to pay");
    text("Pay securely online — card, Apple Pay, and Google Pay accepted:", { size: 9.5, color: MUTED });
    y -= 14;
    for (const line of wrap(quote.hosted_invoice_url, body, 9, CONTENT_W)) {
      ensure(20);
      text(line, { size: 9, color: GOLD });
      y -= 12;
    }
    y -= 14;
  }

  // ---- Footer -------------------------------------------------------------
  const credentials = credentialsLine(profile);
  const footerLines = [
    ...(credentials ? wrap(credentials, italic, 8.5, CONTENT_W) : []),
    `Questions? Contact ${profile.email}${profile.phone ? ` or ${profile.phone}` : ""}.`,
  ];
  const footerY = MARGIN + footerLines.length * 12;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 14 },
    end: { x: PAGE_W - MARGIN, y: footerY + 14 },
    thickness: 0.75,
    color: RULE,
  });
  footerLines.forEach((line, i) => {
    page.drawText(line, {
      x: MARGIN,
      y: footerY - i * 12,
      size: 8.5,
      font: italic,
      color: MUTED,
    });
  });

  return await doc.save();
}
