import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Nav } from "../components/site/Nav";
import { Footer } from "../components/site/Footer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Error 404</p>
        <h1 className="mt-4 font-display text-6xl tracking-tight text-foreground">Page not found</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="btn-gold inline-flex items-center rounded-full px-6 py-3 text-sm font-medium"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something went wrong on our end. Please try again or return home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-gold inline-flex items-center rounded-full px-6 py-3 text-sm font-medium"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Enliven Notary — Mobile & Online Notary | Dallas–Fort Worth, TX" },
      {
        name: "description",
        content:
          "Enliven Notary delivers NNA Certified mobile and remote online notary services across the Dallas–Fort Worth Metroplex. Loan signings, same-day appointments, evenings & weekends.",
      },
      {
        name: "keywords",
        content:
          "mobile notary near me, Dallas mobile notary, mobile notary Dallas, online notary Texas, remote online notary, loan signing agent Dallas, same-day notary, Texas notary public, mobile loan signing services, Fort Worth notary",
      },
      { name: "theme-color", content: "#0f0f10" },
      { property: "og:site_name", content: "Enliven Notary" },
      { property: "og:title", content: "Enliven Notary — Mobile & Online Notary | Dallas–Fort Worth, TX" },
      {
        property: "og:description",
        content:
          "Enliven Notary delivers NNA Certified mobile and remote online notary services across the Dallas–Fort Worth Metroplex. Loan signings, same-day appointments, evenings & weekends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Enliven Notary — Mobile & Online Notary | Dallas–Fort Worth, TX" },
      { name: "twitter:description", content: "Enliven Notary delivers NNA Certified mobile and remote online notary services across the Dallas–Fort Worth Metroplex. Loan signings, same-day appointments, evenings & weekends." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ef3a758-126e-4abc-ab02-a4ce8fa2abff/id-preview-0502e37c--596f7b36-75b5-4578-bce2-d99d4df579c9.lovable.app-1785882946256.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ef3a758-126e-4abc-ab02-a4ce8fa2abff/id-preview-0502e37c--596f7b36-75b5-4578-bce2-d99d4df579c9.lovable.app-1785882946256.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://enlivennotary.example/#business",
          name: "Enliven Notary",
          description:
            "NNA Certified mobile notary and Texas Remote Online Notary serving the Dallas–Fort Worth Metroplex. Loan signings, estate documents, medical, and business notarizations.",
          image: "/favicon.ico",
          telephone: "+1-469-991-2777",
          email: "info@enlivennotary.com",
          priceRange: "$$",
          areaServed: [
            { "@type": "AdministrativeArea", name: "Dallas–Fort Worth Metroplex" },
            { "@type": "State", name: "Texas" },
          ],
          address: {
            "@type": "PostalAddress",
            addressRegion: "TX",
            addressCountry: "US",
          },
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ],
              opens: "07:00",
              closes: "21:00",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-charcoal focus:text-primary-foreground focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </QueryClientProvider>
  );
}
