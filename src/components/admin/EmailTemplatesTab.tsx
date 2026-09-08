import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listEmailTemplates, updateEmailTemplate } from "@/lib/email-templates.functions";
import { renderEmailTemplate, SAMPLE_VALUES, type EmailTemplate } from "@/lib/email-templates";
import { Card, CardHeader } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

export function EmailTemplatesTab() {
  const fetchTemplates = useServerFn(listEmailTemplates);
  const saveTemplate = useServerFn(updateEmailTemplate);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => fetchTemplates({}),
  });

  const selected: EmailTemplate | undefined =
    templates?.find((t) => t.id === selectedId) ?? templates?.[0];

  useEffect(() => {
    if (selected) {
      setSelectedId(selected.id);
      setSubject(selected.subject);
      setBody(selected.body);
      setNotice(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, templates]);

  const mutation = useMutation({
    mutationFn: (values: { id: string; subject: string; body: string }) => saveTemplate({ data: values }),
    onSuccess: (res) => {
      setNotice(res.ok ? res.message : null);
      setError(res.ok ? null : res.message);
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : "Could not save that template."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading email templates…</p>;
  if (!templates || templates.length === 0)
    return <p className="text-sm text-muted-foreground">No email templates yet.</p>;
  if (!selected) return null;

  const isGuidance = selected.type === "ai_instructions";
  const preview = renderEmailTemplate({ subject, body }, SAMPLE_VALUES);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Email templates" className="flex flex-col gap-1.5">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            aria-current={t.id === selected.id}
            className={`rounded-xl px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
              t.id === selected.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            <span className="block font-medium">{t.name}</span>
            <span className="mt-0.5 block text-xs opacity-70">
              {t.type === "ai_instructions" ? "AI guidance" : "Fixed email"}
            </span>
          </button>
        ))}
      </nav>

      <Card>
        <CardHeader title={selected.name} />
        {selected.description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{selected.description}</p>
        )}

        {notice && <p className="mt-6 rounded-xl bg-secondary px-4 py-3 text-sm text-foreground">{notice}</p>}
        {error && <p className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(null);
            setError(null);
            mutation.mutate({ id: selected.id, subject, body });
          }}
        >
          {!isGuidance && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Subject line</span>
              <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">
              {isGuidance ? "Default instructions" : "Email body"}
            </span>
            <textarea
              className={`${field} min-h-[320px] font-mono text-[13px] leading-relaxed`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          {selected.placeholders.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Placeholders you can use:{" "}
              {selected.placeholders.map((p) => (
                <code key={p} className="mr-1.5 rounded bg-secondary px-1.5 py-0.5">{`{{${p}}}`}</code>
              ))}
            </p>
          )}

          <Button type="submit" variant="secondary" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save template"}
          </Button>
        </form>

        <div className="mt-10 border-t border-border pt-8">
          <h3 className="text-sm font-medium text-foreground">
            {isGuidance ? "Guidance preview" : "Live preview (sample details)"}
          </h3>
          {isGuidance ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Every outreach email is still written fresh for each contact using their own stored details — this text
              only sets the tone and direction.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Sample placeholder values shown; real emails use the actual person and appointment details.
            </p>
          )}
          <div className="mt-4 rounded-2xl border border-border bg-background p-6">
            {!isGuidance && (
              <p className="mb-4 text-sm font-medium text-foreground">Subject: {preview.subject}</p>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {isGuidance ? body : preview.text}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
