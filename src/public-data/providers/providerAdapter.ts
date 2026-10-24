import type { FinancialProduct } from "../../shared/types/domain";

export interface ProviderFetchResult {
  providerId: string;
  products: FinancialProduct[];
  warnings: string[];
}

export interface FinancialProviderAdapter {
  readonly id: string;
  readonly jurisdiction: "CA";
  fetchProducts(signal?: AbortSignal): Promise<ProviderFetchResult>;
}
