import type { FinancialProduct } from "../../shared/types/domain";
import type { FinancialProviderAdapter } from "../providers/providerAdapter";

export interface ProviderRefreshSummary {
  products: FinancialProduct[];
  succeeded: string[];
  failed: Array<{ providerId: string; reason: string }>;
  warnings: string[];
  status: "SUCCESS" | "PARTIAL" | "FAILED";
}

export async function refreshProviders(
  adapters: FinancialProviderAdapter[],
  signal?: AbortSignal,
): Promise<ProviderRefreshSummary> {
  const settled = await Promise.allSettled(
    adapters.map((adapter) => adapter.fetchProducts(signal)),
  );
  const products: FinancialProduct[] = [];
  const succeeded: string[] = [];
  const failed: Array<{ providerId: string; reason: string }> = [];
  const warnings: string[] = [];
  settled.forEach((result, index) => {
    const adapter = adapters[index];
    if (adapter === undefined) return;
    if (result.status === "fulfilled") {
      products.push(...result.value.products);
      warnings.push(...result.value.warnings.map((warning) => `${adapter.id}: ${warning}`));
      succeeded.push(adapter.id);
    } else {
      failed.push({
        providerId: adapter.id,
        reason: result.reason instanceof Error ? result.reason.message : "Unknown provider failure",
      });
    }
  });
  return {
    products,
    succeeded,
    failed,
    warnings,
    status: failed.length === 0 ? "SUCCESS" : succeeded.length === 0 ? "FAILED" : "PARTIAL",
  };
}
