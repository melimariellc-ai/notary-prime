import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Shield, UserCheck, UserX } from "lucide-react";
import { listTeamMembers, setTeamMemberActive, setTeamMemberRole } from "@/lib/team.functions";
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
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<TeamMember | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => fetchMembers({}),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: string }) => changeRole({ data: vars }),
    onSuccess: (res) => {
      setNotice(res.ok ? res.message : null);
      setError(res.ok ? null : res.message);
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not update that role."),
  });

  const activeMutation = useMutation({
    mutationFn: (vars: { userId: string; active: boolean }) => changeActive({ data: vars }),
    onSuccess: (res) => {
      setNotice(res.ok ? res.message : null);
      setError(res.ok ? null : res.message);
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not update that account."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading team…</p>;

  if (!data || data.forbidden)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Only Admin accounts can manage users.</p>
      </Card>
    );

  const busy = roleMutation.isPending || activeMutation.isPending;

  return (
    <Card>
      <CardHeader title="Team members" icon={Shield} />
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Change what someone can access, or switch off their sign-in without removing any of their past
        work. Deactivated people keep their history, assignments, and record of changes.
      </p>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {notice && <p className="mt-4 text-sm text-muted-foreground">{notice}</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="py-3 pr-4 font-medium">Name</th>
              <th className="py-3 pr-4 font-medium">Email</th>
              <th className="py-3 pr-4 font-medium">Role</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => {
              const isMe = m.id === data.meId;
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
                      disabled={isMe || busy}
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
                    <Badge tone={m.is_active ? "neutral" : "critical"}>
                      {m.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-4 text-right">
                    {isMe ? (
                      <span className="text-xs text-muted-foreground">
                        You can't deactivate your own account
                      </span>
                    ) : (
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
                  </td>
                </tr>
              );
            })}
            {data.members.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
