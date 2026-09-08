import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Shield, UserCheck, UserX } from "lucide-react";
import { listTeamMembers, setTeamMemberActive, setTeamMemberRole } from "@/lib/team.functions";

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
      <div className="rounded-3xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">Only Admin accounts can manage users.</p>
      </div>
    );

  const busy = roleMutation.isPending || activeMutation.isPending;

  return (
    <div className="rounded-3xl border border-border bg-card p-8">
      <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
        <Shield className="h-5 w-5 text-gold" /> Team members
      </h2>
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
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60 disabled:opacity-60"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        m.is_active
                          ? "bg-secondary text-foreground"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      disabled={isMe || busy}
                      onClick={() => activeMutation.mutate({ userId: m.id, active: !m.is_active })}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
                    >
                      {m.is_active ? (
                        <>
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5" /> Reactivate
                        </>
                      )}
                    </button>
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
    </div>
  );
}
