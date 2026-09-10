import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  FileSpreadsheet,
  Copy,
  ChevronDown,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Mails,
  Menu,
  PanelLeftOpen,
  Receipt,
  Search,
  SlidersHorizontal,
  
  Users,
  X,
} from "lucide-react";
import logoAsset from "@/assets/enliven-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/users.functions";
import { listBusinessContacts } from "@/lib/crm.functions";
import { listInboundReplies } from "@/lib/inbound.functions";

type NotificationItem = {
  id: string;
  kind: "reply" | "overdue";
  title: string;
  detail: string;
  at: string;
  contactId: string | null;
};

const NOTIF_READ_KEY = "admin-notifications-read";

function NotificationBody({ n, unread }: { n: NotificationItem; unread: boolean }) {
  return (
    <div className="flex gap-2">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-gold" : "bg-transparent"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{n.title}</p>
        <p className="break-words text-xs text-muted-foreground">
          {n.kind === "reply" ? "Reply received · " : ""}
          {n.detail}
        </p>
      </div>
    </div>
  );
}

/**
 * Scrolling wrapper for the notification list. Shows a soft fade plus a
 * "more below" hint whenever there is content past the bottom of the list, so a
 * long list never looks like it simply stops.
 */
function NotificationScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setMoreBelow(el.scrollHeight - el.clientHeight - el.scrollTop > 8);
    };
    update();
    el.addEventListener("scroll", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children]);

  return (
    <div className="relative min-h-0 flex-1">
      <ul ref={ref} className="h-full divide-y divide-border overflow-y-auto overscroll-contain">
        {children}
      </ul>
      {moreBelow && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center"
          >
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
              <ChevronDown className="h-3 w-3" /> Scroll for more
            </span>
          </div>
        </>
      )}
    </div>
  );
}


type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  need?: "crm" | "admin";
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Work",
    items: [
      { to: "/admin", label: "Appointment Requests", icon: CalendarClock, exact: true, need: "crm" },
      
      { to: "/admin/mail-activity", label: "Mail Activity", icon: Mails, exact: true, need: "crm" },
      { to: "/admin/crm", label: "Business Development CRM", icon: Users, exact: false, need: "crm" },
      { to: "/admin/duplicates", label: "Duplicate Contacts", icon: Copy, exact: true, need: "crm" },
      { to: "/admin/quotes", label: "Quotes", icon: Receipt, exact: true, need: "crm" },
      { to: "/admin/reports", label: "Reports", icon: FileSpreadsheet, exact: true, need: "crm" },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/admin/settings", label: "Settings", icon: SlidersHorizontal, exact: true, need: "admin" },

    ],
  },
];

const ROUTE_LABELS: { match: (p: string) => boolean; label: string }[] = [
  { match: (p) => p === "/admin/dashboard", label: "Dashboard" },
  { match: (p) => p === "/admin" || p === "/admin/", label: "Appointment Requests" },
  { match: (p) => p.startsWith("/admin/mail-activity"), label: "Mail Activity" },
  { match: (p) => p.startsWith("/admin/crm"), label: "CRM" },
  { match: (p) => p.startsWith("/admin/duplicates"), label: "Duplicate Contacts" },
  { match: (p) => p.startsWith("/admin/quotes"), label: "Quotes" },
  { match: (p) => p.startsWith("/admin/reports"), label: "Reports" },
  
  { match: (p) => p.startsWith("/admin/settings"), label: "Settings" },
  { match: (p) => p.startsWith("/admin/notifications"), label: "My Notification Preferences" },

];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminShell({ email, children }: { email?: string | null; children: ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const detailLabel = useRouterState({
    select: (s) => {
      for (let i = s.matches.length - 1; i >= 0; i -= 1) {
        const data = s.matches[i]?.loaderData as { contact?: { business_name?: string } } | undefined;
        if (data?.contact?.business_name) return data.contact.business_name;
      }
      return null;
    },
  });

  const fetchRole = useServerFn(getMyRole);
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole({}) });
  const isAdmin = me?.isAdmin ?? false;
  const role = me?.role ?? null;
  const canCrm = isAdmin || role === "employee";

  const fetchContacts = useServerFn(listBusinessContacts);
  const { data: crmData } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: () => fetchContacts(),
    enabled: canCrm,
  });
  const contacts = crmData?.contacts ?? [];
  const today = todayISO();
  const overdue = useMemo(
    () => contacts.filter((c) => c.next_follow_up_date && c.next_follow_up_date <= today),
    [contacts, today],
  );

  const fetchReplies = useServerFn(listInboundReplies);
  const { data: replyData } = useQuery({
    queryKey: ["inbound-replies"],
    queryFn: () => fetchReplies(),
    enabled: canCrm,
  });

  const notifications = useMemo<NotificationItem[]>(() => {
    const replies: NotificationItem[] = (replyData?.items ?? []).map((r) => ({
      id: `reply:${r.id}`,
      kind: "reply",
      title: r.business_name ?? r.from_name ?? r.from_email,
      detail: r.subject ?? "(no subject)",
      at: r.received_at,
      contactId: r.contact_id ?? null,
    }));
    const follows: NotificationItem[] = overdue.map((c) => ({
      id: `overdue:${c.id}:${c.next_follow_up_date}`,
      kind: "overdue",
      title: c.business_name,
      detail: `Follow-up due ${c.next_follow_up_date}`,
      at: c.next_follow_up_date as string,
      contactId: c.id,
    }));
    return [...replies, ...follows].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [replyData, overdue]);

  const [readIds, setReadIds] = useState<string[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTIF_READ_KEY);
      if (raw) setReadIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  function openNotifications() {
    setNotifOpen((open) => {
      if (open) return false;
      const ids = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
      setReadIds(ids);
      try {
        window.localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(ids.slice(-500)));
      } catch {
        /* ignore */
      }
      return true;
    });
  }

  useEffect(() => {
    function onDocNotif(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDocNotif);
    return () => document.removeEventListener("mousedown", onDocNotif);
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const stored = window.localStorage.getItem("admin-nav-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileNav(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (canCrm) setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileNav(false);
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCrm]);

  function toggleCollapsed() {
    setCollapsed((v) => {
      window.localStorage.setItem("admin-nav-collapsed", v ? "0" : "1");
      return !v;
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    await router.navigate({ to: "/admin/login", replace: true });
  }

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.need || (i.need === "admin" ? isAdmin : canCrm)),
  })).filter((g) => g.items.length > 0);

  const expanded = !collapsed || hovering;
  const crumb = ROUTE_LABELS.find((r) => r.match(pathname))?.label ?? "Admin";
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-full focus:bg-charcoal focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-charcoal text-primary-foreground">
        <div className="flex h-14 w-full items-center gap-3 px-3 md:px-5">
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            aria-label="Open admin menu"
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 hover:bg-white/10"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link to="/admin/dashboard" className="flex items-center gap-2.5" aria-label="Enliven Notary admin home">
            <span
              role="img"
              aria-label="Enliven Notary logo"
              className="block h-7 w-7 shrink-0 bg-gold"
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
            <span className="hidden font-display text-sm tracking-tight sm:inline">Enliven Notary</span>
          </Link>

          <nav aria-label="Breadcrumb" className="ml-1 min-w-0 flex-1 border-l border-white/15 pl-3">
            <ol className="flex min-w-0 items-center gap-2 text-sm">
              <li className="truncate text-white/60">{crumb}</li>
              {detailLabel && (
                <>
                  <li aria-hidden="true" className="text-white/30">
                    /
                  </li>
                  <li className="truncate font-medium text-white" aria-current="page">
                    {detailLabel}
                  </li>
                </>
              )}
            </ol>
          </nav>

          {canCrm && (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-xs text-white/75 hover:bg-white/10 hover:text-white md:inline-flex"
              >
                <Search className="h-3.5 w-3.5" />
                Search contacts
                <kbd className="rounded border border-white/25 px-1.5 py-0.5 text-[0.6875rem] tracking-wide">⌘K</kbd>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search contacts"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 hover:bg-white/10"
              >
                <Search className="h-4 w-4" />
              </button>

              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={openNotifications}
                  aria-expanded={notifOpen}
                  aria-haspopup="menu"
                  aria-label={`Notifications: ${unreadCount} unread`}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 hover:bg-white/10"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.6875rem] font-semibold text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
                  >
                    <p className="border-b border-border px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Notifications
                    </p>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-5 text-sm text-muted-foreground">
                        You're all caught up — no overdue follow-ups or new replies.
                      </p>
                    ) : (
                      <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                        {notifications.map((n) => (
                          <li key={n.id}>
                            {n.contactId ? (
                              <Link
                                to="/admin/crm/$contactId"
                                params={{ contactId: n.contactId }}
                                onClick={() => setNotifOpen(false)}
                                className="block px-4 py-3 text-left hover:bg-secondary"
                              >
                                <NotificationBody n={n} unread={!readIds.includes(n.id)} />
                              </Link>
                            ) : (
                              <Link
                                to="/admin/dashboard"
                                hash="needs-attention"
                                onClick={() => setNotifOpen(false)}
                                className="block px-4 py-3 text-left hover:bg-secondary"
                              >
                                <NotificationBody n={n} unread={!readIds.includes(n.id)} />
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

            </>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
            >
              <span className="hidden max-w-[10rem] truncate sm:inline">{email ?? "Signed in"}</span>
              {roleLabel && (
                <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.16em] text-gold">
                  {roleLabel}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-xl"
              >
                <p className="px-2 text-xs text-muted-foreground">Signed in as</p>
                <p className="px-2 pb-2 text-sm font-medium break-words">{email}</p>
                {roleLabel && (
                  <p className="px-2 pb-2 text-[0.6875rem] uppercase tracking-[0.2em] text-accent-foreground">
                    {roleLabel} account
                  </p>
                )}
                <Link
                  to="/admin/notifications"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-sm hover:bg-secondary"
                >
                  <Bell className="h-4 w-4 text-accent-foreground" /> My Notification Preferences
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-sm hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4 text-accent-foreground" /> Sign out
                </button>

              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex w-full">
        {/* Desktop sidebar */}
        <aside
          onMouseEnter={() => collapsed && setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={`sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 lg:block ${
            expanded ? "w-64" : "w-[4.5rem]"
          }`}
        >
          <SidebarBody groups={groups} expanded={expanded} pathname={pathname} />
          <div className="border-t border-sidebar-border p-3">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-pressed={collapsed}
              className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {expanded && <span>{collapsed ? "Pin sidebar open" : "Collapse sidebar"}</span>}
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileNav && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <button
              type="button"
              aria-label="Close admin menu"
              onClick={() => setMobileNav(false)}
              className="absolute inset-0 bg-charcoal/60"
            />
            <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-border bg-sidebar shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
                <span className="font-display text-sm tracking-tight">Admin Portal</span>
                <button
                  type="button"
                  onClick={() => setMobileNav(false)}
                  aria-label="Close admin menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarBody groups={groups} expanded pathname={pathname} />
            </div>
          </div>
        )}

        <main id="admin-main" className="min-w-0 flex-1">
          <div key={pathname} className="animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>

      {searchOpen && (
        <QuickSearch
          contacts={contacts.map((c) => ({
            id: c.id,
            business_name: c.business_name,
            contact_person: c.contact_person,
            pipeline_stage: c.pipeline_stage,
          }))}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

function SidebarBody({
  groups,
  expanded,
  pathname,
}: {
  groups: { label: string; items: NavItem[] }[];
  expanded: boolean;
  pathname: string;
}) {
  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-6 overflow-y-auto p-3 pt-5">
      {groups.map((group) => (
        <div key={group.label}>
          {expanded ? (
            <p className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {group.label}
            </p>
          ) : (
            <div aria-hidden="true" className="mx-3 mb-2 h-px bg-sidebar-border" />
          )}
          <ul className="grid gap-1">
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.to || (item.to === "/admin" && pathname === "/admin/")
                : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gold"
                      />
                    )}
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-accent-foreground" : "text-muted-foreground"}`} />
                    {expanded && <span className="truncate">{item.label}</span>}
                    {!expanded && <span className="sr-only">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function QuickSearch({
  contacts,
  onClose,
}: {
  contacts: { id: string; business_name: string; contact_person: string | null; pipeline_stage: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? contacts.filter(
          (c) =>
            c.business_name.toLowerCase().includes(q) ||
            (c.contact_person ?? "").toLowerCase().includes(q),
        )
      : contacts;
    return list.slice(0, 8);
  }, [contacts, query]);

  function go(id: string) {
    onClose();
    void router.navigate({ to: "/admin/crm/$contactId", params: { contactId: id } });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-charcoal/60 p-4 pt-24">
      <button type="button" aria-label="Close search" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search contacts"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[index]) {
                e.preventDefault();
                go(results[index]!.id);
              }
            }}
            placeholder="Search contacts by name…"
            aria-label="Search contacts by name"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">esc</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No contacts match that name.</li>
          )}
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(c.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                  i === index ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.business_name}</span>
                  {c.contact_person && (
                    <span className="block truncate text-xs text-muted-foreground">{c.contact_person}</span>
                  )}
                </span>
                <span className="shrink-0 text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.pipeline_stage}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
