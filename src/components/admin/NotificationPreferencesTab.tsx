import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences.functions";

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[hsl(var(--gold))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export function NotificationPreferencesTab() {
  const load = useServerFn(getNotificationPreferences);
  const save = useServerFn(updateNotificationPreferences);

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [role, setRole] = useState<string>("notary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    load({})
      .then((res) => {
        if (!active) return;
        setPrefs(res.preferences);
        setRole(res.role);
      })
      .catch(() => toast.error("Could not load your notification preferences."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  const update = async (patch: Partial<NotificationPreferences>) => {
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    setSaving(true);
    try {
      const res = await save({ data: patch });
      setPrefs(res.preferences);
      toast.success("Preferences saved.");
    } catch {
      setPrefs(previous);
      toast.error("Could not save your preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading your preferences…</p>;

  const canForward = role === "admin" || role === "employee";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight">Notification preferences</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These settings are yours alone — changing them only affects the emails sent to you.
        </p>
      </div>

      <div className="space-y-4">
        <Toggle
          checked={prefs.daily_digest}
          disabled={saving}
          onChange={(next) => update({ daily_digest: next })}
          label="Receive daily follow-up digest email"
          description="A once-a-day summary of the contacts due for follow-up."
        />
        <Toggle
          checked={prefs.forward_replies}
          disabled={saving || !canForward}
          onChange={(next) => update({ forward_replies: next })}
          label="Receive forwarded copies of client replies"
          description={
            canForward
              ? "Every reply from a client is emailed to you as it arrives. Replies are always saved in the CRM either way."
              : "Only available for admin and employee accounts. Replies are always saved in the CRM."
          }
        />
      </div>
    </div>
  );
}
