import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CONTACT_TYPES, PIPELINE_STAGES } from "@/lib/crm.functions";
import { listCrmOptions } from "@/lib/options.functions";

export type CrmOptionLists = {
  contactTypes: string[];
  pipelineStages: string[];
};

const FALLBACK: CrmOptionLists = {
  contactTypes: [...CONTACT_TYPES],
  pipelineStages: [...PIPELINE_STAGES],
};

/** Admin-managed contact type and pipeline stage lists, with defaults while loading. */
export function useCrmOptions(): CrmOptionLists {
  const fetchOptions = useServerFn(listCrmOptions);
  const { data } = useQuery({
    queryKey: ["crm-options"],
    queryFn: () => fetchOptions(),
    staleTime: 60_000,
  });

  if (!data) return FALLBACK;
  const contactTypes = data.contactTypes.map((o) => o.label);
  const pipelineStages = data.pipelineStages.map((o) => o.label);
  return {
    contactTypes: contactTypes.length ? contactTypes : FALLBACK.contactTypes,
    pipelineStages: pipelineStages.length ? pipelineStages : FALLBACK.pipelineStages,
  };
}

const PALETTE = ["var(--chart-1)", "var(--chart-5)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

/** Stable colour for a stage, based on its position in the configured list. */
export function stageColor(stage: string, stages: readonly string[] = FALLBACK.pipelineStages): string {
  const index = stages.indexOf(stage);
  const safe = index >= 0 ? index : Math.abs(hash(stage)) % PALETTE.length;
  return PALETTE[safe % PALETTE.length];
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}
