import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cities } from "@/data/cities";

const BASE_URL = "https://enlivennotary.com";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/services", priority: "0.9", changefreq: "monthly" },
          { path: "/pricing", priority: "0.8", changefreq: "monthly" },
          { path: "/service-areas", priority: "0.8", changefreq: "monthly" },
          { path: "/about", priority: "0.7", changefreq: "monthly" },
          { path: "/reviews", priority: "0.7", changefreq: "weekly" },
          { path: "/faq", priority: "0.7", changefreq: "monthly" },
          { path: "/contact", priority: "0.8", changefreq: "monthly" },
          { path: "/book", priority: "0.9", changefreq: "monthly" },
          ...cities.map((c) => ({
            path: `/service-areas/${c.slug}`,
            priority: "0.7",
            changefreq: "monthly",
          })),
        ];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ].join("\n"),
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
