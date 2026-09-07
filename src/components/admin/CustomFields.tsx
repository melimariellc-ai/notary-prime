import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listFieldDefs, setCustomFieldValue, type CustomFieldValues, type FieldDef } from "@/lib/fields.functions";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60";

export const CUSTOM_PREFIX = "cf_";

/** Active custom field definitions, shared across the CRM screens. */
export function useFieldDefs() {
  const load = useServerFn(listFieldDefs);
  const { data } = useQuery({
    queryKey: ["contact-field-defs"],
    queryFn: () => load(),
    staleTime: 60_000,
  });
  return (data?.defs ?? []).filter((d) => d.is_active);
}

/** Pull custom field values out of a submitted form's FormData. */
export function customFieldsFromForm(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith(CUSTOM_PREFIX)) out[key.slice(CUSTOM_PREFIX.length)] = String(value ?? "");
  }
  return out;
}

function inputType(def: FieldDef) {
  return def.field_type === "number" ? "number" : def.field_type === "date" ? "date" : "text";
}

/** Uncontrolled inputs for the add-contact form. */
export function CustomFieldInputs() {
  const defs = useFieldDefs();
  if (defs.length === 0) return null;
  return (
    <>
      {defs.map((def) => {
        const id = `${CUSTOM_PREFIX}${def.field_key}`;
        return (
          <div key={def.id}>
            <label htmlFor={id} className="text-sm font-medium">
              {def.label}
            </label>
            {def.field_type === "dropdown" ? (
              <select id={id} name={id} defaultValue="" className={`mt-2 ${inputClass}`}>
                <option value="">Not set</option>
                {def.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input id={id} name={id} type={inputType(def)} className={`mt-2 ${inputClass}`} />
            )}
          </div>
        );
      })}
    </>
  );
}

/** Editable custom field values on the contact detail page. */
export function CustomFieldsPanel({ contactId, values }: { contactId: string; values: CustomFieldValues }) {
  const defs = useFieldDefs();
  if (defs.length === 0) return null;
  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="font-display text-xl tracking-tight">Custom fields</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {defs.map((def) => (
          <CustomFieldRow key={def.id} contactId={contactId} def={def} value={values?.[def.field_key] ?? null} />
        ))}
      </dl>
    </div>
  );
}

function CustomFieldRow({
  contactId,
  def,
  value,
}: {
  contactId: string;
  def: FieldDef;
  value: string | number | null;
}) {
  const save = useServerFn(setCustomFieldValue);
  const router = useRouter();
  const initial = value === null || value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  async function commit(next: string) {
    if (next === initial) return;
    setSaving(true);
    try {
      const res = await save({ data: { contactId, fieldKey: def.field_key, value: next || null } });
      if (res.ok) {
        toast.success(`${def.label} updated.`);
        await router.invalidate();
      } else {
        toast.error(res.message);
        setDraft(initial);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that change.");
      setDraft(initial);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{def.label}</dt>
      <dd className="mt-1.5">
        {def.field_type === "dropdown" ? (
          <select
            aria-label={def.label}
            value={draft}
            disabled={saving}
            onChange={(e) => {
              setDraft(e.target.value);
              void commit(e.target.value);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
          >
            <option value="">Not set</option>
            {def.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label={def.label}
            type={inputType(def)}
            value={draft}
            disabled={saving}
            placeholder="Not set"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commit(draft);
              if (e.key === "Escape") setDraft(initial);
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/60"
          />
        )}
      </dd>
    </div>
  );
}
