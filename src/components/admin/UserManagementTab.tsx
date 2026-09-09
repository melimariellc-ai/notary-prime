import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Mail, Shield, UserCheck, UserPlus, UserX } from "lucide-react";
import {
  listTeamMembers,
  setTeamMemberActive,
  setTeamMemberArchived,
  setTeamMemberRole,
} from "@/lib/team.functions";
import type { TeamMember } from "@/lib/team.functions";
import { createAdminUser } from "@/lib/users.functions";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLES = [
  { value: "notary", label: "Notary" },
  { value: "employee", label: "Employee" },
  { value: "admin", label: "Admin" },
];

const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-background py-2 pl-11 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

export function UserManagementTab() {
  const fetchMembers = useServerFn(listTeamMembers);
  const changeRole = useServerFn(setTeamMemberRole);
  const changeActive = useServerFn(setTeamMemberActive);
  const changeArchived = useServerFn(setTeamMemberArchived);
  const addUser = useServerFn(createAdminUser);
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<TeamMember | null>(null);
  const [pendingArchive, setPendingArchive] = useState<TeamMember | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("notary");
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["team-members", showArchived],
    queryFn: () => fetchMembers({ data: { includeArchived: showArchived } }),
  });

  // Full roster (active + archived) so the live duplicate check catches everyone,
  // even people hidden from the current view.
  const { data: allMembersData } = useQuery({
    queryKey: ["team-members", true],
    queryFn: () => fetchMembers({ data: { includeArchived: true } }),
  });

  const duplicate = useMemo(() => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return null;
    return (
      (allMembersData?.members ?? []).find((m) => (m.email ?? "").toLowerCase() === email) ?? null
    );
  }, [newEmail, allMembersData]);

  function closeAdd() {
    setAddOpen(false);
    setAddError(null);
    setNewName("");
    setNewEmail("");
    setNewRole("notary");
  }

  async function onAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (duplicate) return;
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await addUser({ data: { name: newName, email: newEmail, role: newRole } });
      if (res.ok) {
        setNotice(res.message);
        setError(null);
        queryClient.invalidateQueries({ queryKey: ["team-members"] });
        closeAdd();
      } else {
        setAddError(res.message);
      }
    } catch (err) {
      console.error("Failed to create account", err);
      setAddError("Could not create that account. Please try again.");
    } finally {
      setAddBusy(false);
    }
  }


  const handleResult = (res: { ok: boolean; message: string }) => {
    setNotice(res.ok ? res.message : null);
    setError(res.ok ? null : res.message);
    if (res.ok) queryClient.invalidateQueries({ queryKey: ["team-members"] });
  };

  // Never surface a raw server/HTTP error in the UI — log it and show plain language.
  const friendly = (err: unknown, fallback: string) => {
    console.error(fallback, err);
    setError(fallback);
  };

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: string }) => changeRole({ data: vars }),
    onSuccess: handleResult,
    onError: (err: unknown) => friendly(err, "Could not update that role. Please try again."),
  });

  const activeMutation = useMutation({
    mutationFn: (vars: { userId: string; active: boolean }) => changeActive({ data: vars }),
    onSuccess: handleResult,
    onError: (err: unknown) =>
      friendly(err, "Could not update that account. Please reload the page and try again."),
  });


  const archiveMutation = useMutation({
    mutationFn: (vars: { userId: string; archived: boolean }) => changeArchived({ data: vars }),
    onSuccess: handleResult,
    onError: (err: unknown) =>
      friendly(err, "Could not update that account. Please reload the page and try again."),

  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading team…</p>;

  if (!data || data.forbidden)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Only Admin accounts can manage users.</p>
      </Card>
    );

  const busy = roleMutation.isPending || activeMutation.isPending || archiveMutation.isPending;
  const canDeactivate = data.canDeactivateUsers;
  const canArchive = data.canArchiveUsers;
  const showActions = canDeactivate || canArchive;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CardHeader title="Team members" icon={Shield} />
        <Button type="button" variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add member
        </Button>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Change what someone can access, or switch off their sign-in without removing any of their past
        work. Deactivated and archived people keep their history, assignments, and record of changes.
      </p>


      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {notice && <p className="mt-4 text-sm text-muted-foreground">{notice}</p>}

      {canArchive && (
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[hsl(var(--gold))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          />
          Show archived users
        </label>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Name</th>
              <th className="py-3 pr-4 font-medium">Email</th>
              <th className="py-3 pr-4 font-medium">Role</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              {showActions && <th className="py-3 font-medium text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => {
              const isMe = m.id === data.meId;
              const archived = Boolean(m.archived_at);
              const isOwner = Boolean(m.is_owner);
              return (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="py-4 pr-4 font-medium">
                    {m.name}
                    {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="py-4 pr-4 text-muted-foreground">{m.email}</td>
                  <td className="py-4 pr-4">
                    <label className="sr-only" htmlFor={`role-${m.id}`}>
                      Role for {m.name}
                    </label>
                    <select
                      id={`role-${m.id}`}
                      value={m.role}
                      disabled={isMe || isOwner || busy}
                      onChange={(e) => roleMutation.mutate({ userId: m.id, role: e.target.value })}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:opacity-60"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={m.is_active ? "neutral" : "critical"}>
                        {m.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {archived && <Badge tone="critical">Archived</Badge>}
                      {isOwner && <Badge tone="neutral">Owner</Badge>}
                    </div>
                  </td>
                  {showActions && (
                    <td className="py-4 text-right">
                      {isOwner ? (
                        <span className="text-xs text-muted-foreground">
                          Owner account — protected, cannot be deactivated
                        </span>
                      ) : isMe ? (
                        <span className="text-xs text-muted-foreground">
                          You can't deactivate your own account
                        </span>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          {canDeactivate && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                m.is_active
                                  ? setPendingDeactivate(m)
                                  : activeMutation.mutate({ userId: m.id, active: true })
                              }
                            >
                              {m.is_active ? (
                                <>
                                  <UserX className="h-4 w-4" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" /> Reactivate
                                </>
                              )}
                            </Button>
                          )}
                          {canArchive && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                archived
                                  ? archiveMutation.mutate({ userId: m.id, archived: false })
                                  : setPendingArchive(m)
                              }
                            >
                              {archived ? (
                                <>
                                  <ArchiveRestore className="h-4 w-4" /> Restore
                                </>
                              ) : (
                                <>
                                  <Archive className="h-4 w-4" /> Archive
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {data.members.length === 0 && (
              <tr>
                <td colSpan={showActions ? 5 : 4} className="py-8 text-center text-muted-foreground">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeactivate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {pendingDeactivate?.name}?</DialogTitle>
            <DialogDescription>
              {pendingDeactivate?.name} ({pendingDeactivate?.email}) will keep their history,
              assignments, and record of changes — nothing is deleted. They will immediately lose the
              ability to log in until you reactivate them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setPendingDeactivate(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (!pendingDeactivate) return;
                activeMutation.mutate({ userId: pendingDeactivate.id, active: false });
                setPendingDeactivate(null);
              }}
            >
              <UserX className="h-4 w-4" /> Yes, deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingArchive !== null}
        onOpenChange={(open) => {
          if (!open) setPendingArchive(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {pendingArchive?.name}?</DialogTitle>
            <DialogDescription>
              {pendingArchive?.name} ({pendingArchive?.email}) will be hidden from this list and can no
              longer log in. Nothing is deleted: their history entries, record of changes, and any
              appointments or contacts assigned to them stay exactly as they are. Turn on "Show archived
              users" any time to bring them back.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (!pendingArchive) return;
                archiveMutation.mutate({ userId: pendingArchive.id, archived: true });
                setPendingArchive(null);
              }}
            >
              <Archive className="h-4 w-4" /> Yes, archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) closeAdd();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              They'll get a welcome email with a secure link to set their own password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onAddUser}>
            <label htmlFor="new-name" className="text-sm font-medium">
              Name
            </label>
            <div className="relative mt-2">
              <UserPlus className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="new-name"
                type="text"
                required
                autoComplete="off"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <label htmlFor="new-email" className="mt-5 block text-sm font-medium">
              Email
            </label>
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="new-email"
                type="email"
                required
                autoComplete="off"
                aria-invalid={duplicate ? true : undefined}
                aria-describedby={duplicate ? "new-email-duplicate" : undefined}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            {duplicate && (
              <p id="new-email-duplicate" className="mt-2 text-sm text-destructive">
                {duplicate.email} already belongs to {duplicate.name}
                {duplicate.archived_at ? " (archived)" : duplicate.is_active ? "" : " (deactivated)"} — use a
                different email address.
              </p>
            )}

            <label htmlFor="new-role" className="mt-5 block text-sm font-medium">
              Role
            </label>
            <div className="relative mt-2">
              <Shield className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="new-role"
                required
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className={`${FIELD_CLASS} appearance-none`}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {addError && <p className="mt-4 text-sm text-destructive">{addError}</p>}

            <DialogFooter className="mt-6">
              <Button type="button" variant="secondary" onClick={closeAdd}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={addBusy || !newName || !newEmail || Boolean(duplicate)}
              >
                {addBusy ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>

  );
}
