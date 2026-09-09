import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

/**
 * Renders a PDF inline by rasterising its pages with pdf.js.
 *
 * This deliberately avoids <iframe src="blob:..."> / <embed>: Chrome refuses to
 * display PDFs inline when "Download PDFs instead of automatically opening
 * them" is enabled (and some managed profiles/extensions force that), which
 * shows a "This page has been blocked by Chrome" panel instead of the document.
 * Canvas rendering works regardless of that setting. If rendering fails for any
 * reason we show an explicit fallback with a working link.
 */
export function PdfPreview({
  bytes,
  fallbackUrl,
  className,
}: {
  bytes: Uint8Array;
  fallbackUrl: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    setState("loading");
    host.replaceChildren();

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      // pdf.js takes ownership of the buffer it is given, so hand it a copy.
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      if (cancelled) return;

      const width = host.clientWidth || 720;
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (width / base.width) * dpr });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.className = "rounded-xl border border-border bg-white";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `Quote document page ${pageNumber}`);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        host.appendChild(canvas);
      }
      setState("ready");
    })().catch((err) => {
      if (cancelled) return;
      console.error("Inline PDF preview failed to render", err);
      setState("failed");
    });

    return () => {
      cancelled = true;
    };
  }, [bytes]);

  return (
    <div className={className}>
      {state === "failed" ? (
        <div className="rounded-xl border border-border bg-card/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">Preview unavailable in this browser.</p>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent-foreground underline underline-offset-4"
          >
            <ExternalLink className="h-4 w-4" /> Open the document in a new tab
          </a>
        </div>
      ) : (
        <>
          {state === "loading" && (
            <p className="pb-2 text-xs text-muted-foreground">Rendering document…</p>
          )}
          <div ref={hostRef} className="grid max-h-[32rem] gap-3 overflow-y-auto" />
        </>
      )}
    </div>
  );
}
