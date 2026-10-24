# Slowth Money architecture

## Boundaries

Slowth Money is split into independently testable layers:

1. `core/` owns deterministic, side-effect-free financial calculations, goals, recommendations, progress, and freshness.
2. `data/` owns SQLite migrations, repositories, and AES-256-GCM encrypted private records. Electron `safeStorage` protects the data-encryption key.
3. `ai/` talks only to loopback Ollama. It supports broad financial-planning conversation plus focused profile updates. All structured output is parsed and validated; product citations must resolve to IDs already present in the local cache.
4. `public-data/` discovers and normalizes public facts. Requests accept public search terms only and records retain source provenance.
5. `main/` owns Electron, IPC, native notifications, and wake-on-launch refresh scheduling.
6. `renderer/` displays data and requests operations through the narrow preload bridge. It does not access Node APIs.

Private profile values never enter `public-data/`. Public products and rules never need private context until both are combined locally in `core/planning`.

When a SerpApi key is configured, a stale or user-triggered product refresh performs one generic Canada/product/month discovery query and then refreshes the isolated official-provider adapters. Without a key, the adapters continue directly. Discovery failure does not stop the official provider checks, and neither query path accepts profile data.

The **Ask Slowth** request is assembled in the Electron main process from the encrypted profile, goal, deterministic projections and offer comparisons, cache freshness, and normalized public products. That combined context goes only to local Ollama. External provider pages and search services never receive prompts, conversation history, or profile data. Advisor conversations remain in renderer memory and are not written to SQLite.

## Domain model

- `FinancialProfile` — encrypted private household inputs; all material eligibility fields have an explicit unknown state.
- `Goal` and `GoalSnapshot` — the primary target plus historical evidence for progress events.
- `AccountHolding` — a user-recorded balance, separate from provider products and without credentials.
- `FinancialProduct` — a public product with independently known or unknown wrapper support.
- `PublicFact` and `SourceProvenance` — versioned facts with trust, timestamps, and conflict state.
- `Recommendation` — an inspectable action backed by deterministic values, assumptions, tradeoffs, sources, and confidence.
- `ActivityEvent` — an audit-friendly local timeline entry.

Money is represented as integer cents. Rates use decimal fractions (for example, `0.03` means 3%). Calendar calculations use explicit ISO dates.

## Database schema

Migration `001_initial` creates:

- `private_records`: opaque AES-GCM envelopes for profile, goal, settings, and API secrets;
- `goal_snapshots`: encrypted snapshots used for deterministic milestone detection;
- `public_facts`, `financial_products`, and `source_records`: non-private cached facts and provenance;
- `refresh_state`: category freshness, partial failures, and next-due state;
- `search_cache` and `search_usage`: public query cache and local monthly counters;
- `activities` and `recommendations`: local history with inspectable evidence;
- `app_meta`: migration and application metadata.

No decrypted private value is stored in SQLite or written to logs.

## Implementation phases

1. Scaffold strict Electron/React/TypeScript runtime and core domain types.
2. Implement deterministic finance, freshness, trust, unknown-state, and progress engines with unit tests.
3. Add migrations, safeStorage-protected key management, encrypted repositories, and integration tests.
4. Add country-pack, public search/provider abstractions, provenance, cache, and partial refresh behavior.
5. Add Ollama status, broad local planning conversations, validated natural-language patches, and deterministic fallback behavior.
6. Build the nine-screen desktop UI, demo separation, offline states, notifications, and scripted demo controls.
7. Validate, polish screenshots/accessibility, and keep the README and limitations honest.

## Failure model

Provider refreshes are isolated and return partial success. Missing Ollama, SerpApi, network, or provider pages never prevent local calculations or cached-data access. Unknown values remain unknown; they are not converted to zero, false, or a convenient eligibility assumption.
