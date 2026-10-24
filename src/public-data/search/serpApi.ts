import type { PublicSearchQuery, SearchProvider, SearchResult } from "./searchProvider";

export class SerpApiSearchProvider implements SearchProvider {
  public constructor(private readonly apiKey: string) {}

  public async search(query: PublicSearchQuery, signal?: AbortSignal): Promise<SearchResult[]> {
    const params = new URLSearchParams({ api_key: this.apiKey, engine: "google", q: query });
    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`,
      signal === undefined ? undefined : { signal },
    );
    if (!response.ok) throw new Error(`SerpApi request failed (${response.status}).`);
    const body = (await response.json()) as {
      error?: unknown;
      organic_results?: Array<{ title?: unknown; link?: unknown; snippet?: unknown }>;
    };
    if (typeof body.error === "string") {
      throw new Error("SerpApi rejected the request. Check the saved API key and account status.");
    }
    return (body.organic_results ?? []).flatMap((result) =>
      typeof result.title === "string" && typeof result.link === "string"
        ? [
            {
              title: result.title,
              url: result.link,
              snippet: typeof result.snippet === "string" ? result.snippet : "",
            },
          ]
        : [],
    );
  }
}
