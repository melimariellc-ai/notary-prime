import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Archive, ArchiveRestore, Shield, UserCheck, UserX } from "lucide-react";
import {
  listTeamMembers,
  setTeamMemberActive,
  setTeamMemberArchived,
  setTeamMemberRole,
} from "@/lib/team.functions";
import type { TeamMember } from "@/lib/team.functions";
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

export function UserManagementTab() {
  const fetchMembers = useServerFn(listTeamMembers);
  const changeRole = useServerFn(setTeamMemberRole);
  const changeActive = useServerFn(setTeamMemberActive);
  const changeArchived = useServerFn(setTeamMemberArchived);
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<TeamMember | null>(null);
  const [pendingArchive, setPendingArchive] = useState<TeamMember | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["team-members", showArchived],
    queryFn: () => fetchMembers({ data: { includeArchived: showArchived } }),
  });

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
      <CardHeader title="Team members" icon={Shield} />
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
    </Card>
  );
}
