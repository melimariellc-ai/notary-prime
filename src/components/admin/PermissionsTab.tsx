import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import {
  listAdminPermissions,
  setAdminPermission,
  PERMISSIONS,
  PERMISSION_LABELS,
  type AdminPermission,
} from "@/lib/permissions.functions";
import { Card, CardHeader } from "@/components/admin/ui/Card";

const DESCRIPTIONS: Record<AdminPermission, string> = {
  can_archive_users: "Hide someone from the team list and switch off their sign-in, keeping all records.",
  can_deactivate_users: "Switch off someone's sign-in without archiving them.",
  can_grant_permissions: "Give or remove these permissions on other Admin accounts.",
};

export function PermissionsTab() {
  const fetchAdmins = useServerFn(listAdminPermissions);
  const savePermission = useServerFn(setAdminPermission);
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => fetchAdmins({}),
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; permission: AdminPermission; enabled: boolean }) =>
      savePermission({ data: vars }),
    onSuccess: (res) => {
      setNotice(res.ok ? res.message : null);
      setError(res.ok ? null : res.message);
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : "Could not save that change."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading permissions…</p>;

  if (!data || data.forbidden)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">
          You do not have permission to manage permissions.
        </p>
      </Card>
    );

  return (
    <Card>
      <CardHeader title="Admin permissions" icon={KeyRound} />
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Turn each ability on or off for any Admin account, one at a time. Everything is off by default.
      </p>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {notice && <p className="mt-4 text-sm text-muted-foreground">{notice}</p>}

      <div className="mt-6 space-y-6">
        {data.admins.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border/60 p-5">
            <p className="font-medium">
              {a.name}
              {a.id === data.meId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="text-sm text-muted-foreground">{a.email}</p>
            <div className="mt-4 space-y-3">
              {PERMISSIONS.map((p) => {
                const on = a.permissions.includes(p);
                return (
                  <label key={p} className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={mutation.isPending}
                      onChange={(e) =>
                        mutation.mutate({ userId: a.id, permission: p, enabled: e.target.checked })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--gold))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                    />
                    <span>
                      <span className="font-medium">{PERMISSION_LABELS[p]}</span>
                      <span className="block text-xs text-muted-foreground">{DESCRIPTIONS[p]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {data.admins.length === 0 && (
          <p className="text-sm text-muted-foreground">No Admin accounts yet.</p>
        )}
      </div>
    </Card>
  );
}
