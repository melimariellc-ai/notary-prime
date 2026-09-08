import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { createCrmOption, deleteCrmOption, moveCrmOption, type OptionKind } from "@/lib/options.functions";
import { Card } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

export type OptionRow = { id: string; label: string; sort_order: number; inUse: number };

export function CrmOptionsTab({
  kind,
  rows,
  heading,
  addHeading,
  placeholder,
  intro,
  noun,
}: {
  kind: OptionKind;
  rows: OptionRow[];
  heading: string;
  addHeading: string;
  placeholder: string;
  intro: string;
  noun: string;
}) {
  const router = useRouter();
  const create = useServerFn(createCrmOption);
  const move = useServerFn(moveCrmOption);
  const remove = useServerFn(deleteCrmOption);

  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<OptionRow | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await create({ data: { kind, label } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setLabel("");
      toast.success(`${noun} added.`);
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that option.");
    } finally {
      setBusy(false);
    }
  }

  async function onMove(id: string, direction: "up" | "down") {
    const res = await move({ data: { id, direction } });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    await router.invalidate();
  }

  async function onDelete(row: OptionRow) {
    const res = await remove({ data: { id: row.id } });
    setConfirm(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`${noun} removed.`);
    await router.invalidate();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-xl tracking-tight">{heading}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{intro}</p>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row, i) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0">
                <p className="font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">
                  {row.inUse === 0
                    ? "Not used yet"
                    : `${row.inUse} ${row.inUse === 1 ? "contact" : "contacts"}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void onMove(row.id, "up")}
                  disabled={i === 0}
                  aria-label={`Move ${row.label} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void onMove(row.id, "down")}
                  disabled={i === rows.length - 1}
                  aria-label={`Move ${row.label} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    row.inUse > 0
                      ? toast.error(
                          `Cannot remove: ${row.inUse} ${row.inUse === 1 ? "contact" : "contacts"} currently use this ${noun.toLowerCase()}. Reassign them first.`,
                        )
                      : setConfirm(row)
                  }
                  aria-label={`Remove ${row.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <form onSubmit={onCreate}>
          <h2 className="font-display text-xl tracking-tight">{addHeading}</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor={`new-${kind}`} className="text-sm text-muted-foreground">
                Name
              </label>
              <input
                id={`new-${kind}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                maxLength={80}
                placeholder={placeholder}
                className={`mt-2 ${inputClass}`}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : `Add ${noun.toLowerCase()}`}
            </Button>
            <p className="text-xs text-muted-foreground">
              An option in use by existing contacts cannot be removed until those contacts are reassigned.
            </p>
          </div>
        </form>
      </Card>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setConfirm(null)}
        >
          <Card className="w-full max-w-md">
            <h3 className="font-display text-xl tracking-tight">Remove “{confirm.label}”?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              It will no longer appear as a choice on contacts. No contacts currently use it.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void onDelete(confirm)}>
                Remove
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
