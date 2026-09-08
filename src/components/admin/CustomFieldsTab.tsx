import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { FIELD_TYPES, createFieldDef, deleteFieldDef, updateFieldDef, type FieldDef } from "@/lib/fields.functions";
import { Card } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
};

export function CustomFieldsTab({ defs }: { defs: FieldDef[] }) {
  const router = useRouter();
  const create = useServerFn(createFieldDef);
  const update = useServerFn(updateFieldDef);
  const remove = useServerFn(deleteFieldDef);

  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [options, setOptions] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await create({ data: { label, field_type: fieldType, options } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setLabel("");
      setOptions("");
      setFieldType("text");
      toast.success("Field added.");
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create that field.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(def: FieldDef) {
    const res = await update({
      data: {
        id: def.id,
        label: def.label,
        field_type: def.field_type,
        options: def.options,
        sort_order: def.sort_order,
        is_active: !def.is_active,
      },
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(def.is_active ? "Field hidden." : "Field shown.");
    await router.invalidate();
  }

  async function onDelete(id: string) {
    const res = await remove({ data: { id } });
    setConfirmId(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Field removed.");
    await router.invalidate();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-xl tracking-tight">Your fields</h2>
        </div>
        {defs.length === 0 ? (
          <p className="px-6 py-12 text-center text-muted-foreground">
            No custom fields yet. Add one on the right — for example “Preferred closing day” or “Annual volume”.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {defs.map((def) => (
              <li key={def.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{def.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[def.field_type] ?? def.field_type}
                    {def.field_type === "dropdown" && def.options.length > 0 ? ` · ${def.options.join(", ")}` : ""}
                    {def.is_active ? "" : " · hidden"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => void toggleActive(def)}>
                    {def.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmId(def.id)}
                    aria-label={`Remove ${def.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <form onSubmit={onCreate}>
          <h2 className="font-display text-xl tracking-tight">Add a field</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="label" className="text-sm text-muted-foreground">
                Field name
              </label>
              <input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                maxLength={80}
                placeholder="Preferred closing day"
                className={`mt-2 ${inputClass}`}
              />
            </div>
            <div>
              <label htmlFor="field_type" className="text-sm text-muted-foreground">
                Field type
              </label>
              <select
                id="field_type"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                className={`mt-2 ${inputClass}`}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            {fieldType === "dropdown" && (
              <div>
                <label htmlFor="options" className="text-sm text-muted-foreground">
                  Choices (comma separated)
                </label>
                <input
                  id="options"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Monday, Wednesday, Friday"
                  className={`mt-2 ${inputClass}`}
                />
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add field"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Removing a field takes it off the forms; any values already saved on contacts stay in the record.
            </p>
          </div>
        </form>
      </Card>

      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setConfirmId(null)}
        >
          <Card className="w-full max-w-md">
            <h3 className="font-display text-xl tracking-tight">Remove this field?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              It will disappear from the contact forms. Values already saved on contacts are kept.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void onDelete(confirmId)}>
                Remove field
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
