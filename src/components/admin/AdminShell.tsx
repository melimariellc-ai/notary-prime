import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarClock, ChevronDown, LayoutDashboard, LogOut, Menu, UserPlus, Users, X } from "lucide-react";
import logoAsset from "@/assets/enliven-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/users.functions";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin", label: "Appointment Requests", icon: CalendarClock, exact: true },
  { to: "/admin/crm", label: "Business Development CRM", icon: Users, exact: false },
  { to: "/admin/users", label: "Add User", icon: UserPlus, exact: true, adminOnly: true },
] as const;

export function AdminShell({ email, children }: { email?: string | null; children: ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchRole = useServerFn(getMyRole);
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole({}) });
  const isAdmin = me?.isAdmin ?? false;
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    await router.navigate({ to: "/admin/login", replace: true });
  }

  const items = navItems.filter((i) => !("adminOnly" in i && i.adminOnly) || isAdmin);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-charcoal text-primary-foreground">
        <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? "Close admin menu" : "Open admin menu"}
              aria-expanded={navOpen}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20"
            >
              {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-2.5" aria-label="Enliven Notary admin home">
              <span
                role="img"
                aria-label="Enliven Notary logo"
                className="block h-8 w-8 shrink-0 bg-gold"
                style={{
                  maskImage: `url(${logoAsset.url})`,
                  WebkitMaskImage: `url(${logoAsset.url})`,
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                }}
              />
              <span className="font-display text-base tracking-tight whitespace-nowrap">Enliven Notary</span>
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full border border-gold/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-gold">
              Admin Portal
            </span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs text-white/80 hover:text-white"
            >
              <span className="max-w-[11rem] truncate">{email ?? "Signed in"}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-lg">
                <p className="px-2 text-xs text-muted-foreground">Signed in as</p>
                <p className="px-2 pb-2 text-sm font-medium break-words">{email}</p>
                {me?.role && (
                  <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-gold">{me.role}</p>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4 text-gold" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[92rem] gap-0 px-0 lg:px-6">
        <aside
          className={`${navOpen ? "block" : "hidden"} lg:block w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-sidebar lg:bg-transparent`}
        >
          <nav aria-label="Admin" className="flex flex-col gap-1 p-4 lg:sticky lg:top-20">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{ className: "bg-accent text-accent-foreground border-gold/40" }}
                inactiveProps={{ className: "text-muted-foreground border-transparent hover:bg-secondary" }}
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors"
              >
                <item.icon className="h-4 w-4 text-gold" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main id="admin-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
