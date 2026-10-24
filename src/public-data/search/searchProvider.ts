export type PublicSearchQuery = string & { readonly __publicSearchQuery: unique symbol };

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  search(query: PublicSearchQuery, signal?: AbortSignal): Promise<SearchResult[]>;
}

export function buildPublicProductQuery(input: {
  country: "Canada";
  category: "high interest savings" | "GIC" | "bank promotions";
  month: string;
}): PublicSearchQuery {
  return `${input.country} ${input.category} ${input.month} official rates` as PublicSearchQuery;
}
