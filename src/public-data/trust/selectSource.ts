import { SOURCE_TRUST } from "../../shared/constants/policies";
import type { SourceProvenance } from "../../shared/types/domain";

export interface SourceSelection {
  selected: SourceProvenance | null;
  conflict: boolean;
}

export function selectMostTrustedSource(
  candidates: Array<{ provenance: SourceProvenance; value: unknown }>,
): SourceSelection {
  if (candidates.length === 0) return { selected: null, conflict: false };
  const sorted = [...candidates].sort(
    (a, b) => SOURCE_TRUST[b.provenance.sourceType] - SOURCE_TRUST[a.provenance.sourceType],
  );
  const selected = sorted[0];
  if (selected === undefined) return { selected: null, conflict: false };
  const highTrust = sorted.filter(({ provenance }) => SOURCE_TRUST[provenance.sourceType] >= 0.95);
  return {
    selected: selected.provenance,
    conflict: highTrust.some(
      ({ value }) => JSON.stringify(value) !== JSON.stringify(selected.value),
    ),
  };
}
