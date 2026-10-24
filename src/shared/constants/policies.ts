import type { LazinessMode, SourceType } from "../types/domain";

export const FRESHNESS_DAYS = {
  FINANCIAL_PRODUCTS: 7,
  COUNTRY_RULES: 30,
} as const;

export const LAZINESS_THRESHOLDS_CENTS: Record<Exclude<LazinessMode, "CUSTOM">, number> = {
  OPTIMIZER: 2_500,
  RELAXED: 15_000,
  EXTREMELY_LAZY: 50_000,
};

export const SOURCE_TRUST: Record<SourceType, number> = {
  GOVERNMENT_REGULATOR: 1,
  FINANCIAL_INSTITUTION: 0.95,
  ESTABLISHED_COMPARISON: 0.75,
  FINANCIAL_PUBLICATION: 0.7,
  GENERAL_WEB: 0.4,
  FORUM_SOCIAL: 0.2,
};

export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "gemma3:12b";
