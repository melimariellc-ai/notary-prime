import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/AdminPageHeader";
import {
  FIELD_TYPES,
  createFieldDef,
  deleteFieldDef,
  listFieldDefs,
  updateFieldDef,
  type FieldDef,
} from "@/lib/fields.functions";

export const Route = createFileRoute("/admin/_protected/fields")({
  loader: () => listFieldDefs(),
  head: () => ({
    meta: [
      { title: "Manage Fields | Enliven Notary" },
      { name: "description", content: "Define custom fields for Enliven Notary business contacts." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Manage Fields | Enliven Notary" },
      { property: "og:description", content: "Private admin settings for custom contact fields." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FieldsPage,
  errorComponent: () => (
    <div className="px-8 py-24 text-center text-muted-foreground">Something went wrong. Please refresh.</div>
  ),
  notFoundComponent: () => <div className="px-8 py-24 text-center text-muted-foreground">Page not found.</div>,
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60";

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
};

function FieldsPage() {
  const { defs } = Route.useLoaderData();
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
    <>
      <AdminPageHeader
        eyebrow="Admin"
        title={
          <>
            Manage <span className="italic font-light text-gradient-gold">fields.</span>
          </>
        }
        intro="Add your own fields to business contacts — a text note, a number, a date, or a dropdown of set choices. They appear on the new-contact form and on every contact page."
      />

      <AdminSection>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-3xl border border-border bg-card">
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
                      <button
                        type="button"
                        onClick={() => void toggleActive(def)}
                        className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-secondary"
                      >
                        {def.is_active ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(def.id)}
                        aria-label={`Remove ${def.label}`}
                        className="rounded-full border border-border p-2 text-muted-foreground hover:bg-secondary"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={onCreate} className="rounded-3xl border border-border bg-card p-6">
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
              <button
                type="submit"
                disabled={busy}
                className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add field"}
              </button>
              <p className="text-xs text-muted-foreground">
                Removing a field takes it off the forms; any values already saved on contacts stay in the record.
              </p>
            </div>
          </form>
        </div>
      </AdminSection>

      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-6"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setConfirmId(null)}
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6">
            <h3 className="font-display text-xl tracking-tight">Remove this field?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              It will disappear from the contact forms. Values already saved on contacts are kept.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onDelete(confirmId)}
                className="rounded-full bg-destructive px-5 py-2 text-sm font-medium text-destructive-foreground"
              >
                Remove field
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
