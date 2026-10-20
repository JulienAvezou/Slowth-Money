# Slowth Money Repository Guidance

This file is persistent guidance for every Codex agent working in this repository. Read it before planning or changing the project. More specific `AGENTS.md` files may refine these rules for their subtrees, but they must not weaken the privacy or financial-safety requirements below.

## Product identity and purpose

The product is **Slowth Money**, a local-first personal finance planning desktop application. Use **Slowth Money** consistently in the application UI, window titles, documentation, README, onboarding, settings, demo mode, notifications, and all other user-facing copy. Do not rename it unless the user explicitly asks.

Slowth Money helps people spend less time on repetitive financial optimization while keeping sensitive financial information private. Its personality may be lightly sloth-inspired—patient, steady, calm, and low-effort—but it must remain credible and trustworthy. Never turn serious financial guidance into a joke.

Appropriate examples include:

- “Slowth checked your plan.”
- “Relax. You’re still on track.”
- “Slow and steady is working.”
- “Slowth found one opportunity worth your attention.”

The governing philosophy is:

> The application should behave like a sloth: wake up when useful work needs to be done, do that work efficiently, and otherwise stay out of the user's way.

## Non-negotiable product principles

Slowth Money is:

- local-first and privacy-first;
- educational and advisory, never transactional;
- conservative when facts or financial outcomes are uncertain;
- designed to minimize unnecessary user attention;
- powered by open-weight AI running locally;
- initially focused on Canadian savings and goal planning.

Its privacy boundary is:

> The internet knows what financial products exist.  
> The local model knows your financial situation.  
> External services never need to know both.

When requirements conflict, use this priority order:

1. privacy and financial safety;
2. correctness;
3. explicit user requirements;
4. maintainability;
5. reliability;
6. user experience;
7. implementation convenience.

## Approved technical baseline

Unless an explicit later requirement changes it, use:

- Electron;
- React;
- Vite;
- TypeScript with strict compiler settings;
- SQLite through `better-sqlite3`;
- Zod for runtime validation;
- Ollama for local inference;
- `gemma3:12b` as the default local model;
- SerpApi for public-web discovery;
- Electron/native desktop notifications;
- Vitest for unit and integration tests;
- Playwright for selected end-to-end tests where it adds value.

Prefer TypeScript throughout. Do not add a required cloud backend or unnecessary infrastructure, frameworks, or dependencies. Before adding a dependency, confirm that the platform, standard library, or existing dependencies do not already solve the problem cleanly.

## Architecture and dependency boundaries

Keep these concerns explicitly separated:

1. private user data;
2. deterministic financial calculations;
3. local LLM reasoning;
4. country-specific financial knowledge;
5. public market and product data;
6. UI and desktop-platform concerns.

Core domain and financial logic must not depend directly on React or Electron. Put business logic in independently testable modules. Prefer small focused files, explicit interfaces, clear domain types, dependency injection at boundaries, and explicit error handling over multipurpose modules or hidden mutable state.

Model country-specific behavior with country packs or an equivalent modular abstraction. Canada is the first supported country, but its rules must not be scattered through generic domain logic or hardcoded into prompts.

Keep account wrappers separate from financial products:

- wrappers include TFSA, FHSA, RRSP, and non-registered accounts;
- products include savings accounts, HISAs, GICs, and cash accounts.

Do not assume a product or promotion is offered in every wrapper. Provider records should state supported wrappers when known; otherwise support remains explicitly unknown.

## Private data and local security

Sensitive information must remain local, including salary, income, expenses, savings, debts, balances, goals, target dates, family plans, contribution room, current accounts, and personal preferences.

Never:

- send private profile or financial context to SerpApi, provider sites, or any external service;
- put private values into external search queries;
- add external analytics or telemetry;
- log sensitive financial values;
- collect bank passwords, PINs, MFA codes, or other banking credentials;
- commit API keys, encryption keys, or secrets.

Only the locally running model may receive private financial context. Persist sensitive information using secure local-storage practices and encryption. Keep key material separate from encrypted data and source control. Treat logs, fixtures, crash reports, development tools, exports, and error messages as possible data-exfiltration paths.

## Financial safety and uncertainty

Slowth Money recommends and explains; it does not transact. Do not implement:

- bank transfers or automatic movement of money;
- securities trading;
- account opening;
- submission of forms to financial institutions;
- collection of banking credentials;
- guarantees of financial outcomes.

All consequential recommendations must be inspectable before a user acts. Show material assumptions, uncertainties, calculations, and supporting evidence.

Unknown is a first-class domain value, not a prompt to guess. Never silently infer TFSA room, FHSA eligibility, promotion eligibility, account status, wrapper support, or any other material fact. Preserve unknowns through storage, calculations, LLM inputs and outputs, and UI presentation. Never fabricate a missing rate, fee, eligibility rule, product attribute, regulation, or successful provider result.

## Deterministic financial calculations

Implement financial mathematics in deterministic, typed code—not in prompts or delegated LLM reasoning. This includes:

- interest and compound growth;
- contribution and goal projections;
- switching benefits;
- promotion durations and expiry;
- fees;
- completion dates;
- GIC maturity;
- threshold comparisons;
- progress milestones.

Unit-test every significant numerical calculation, including boundary conditions, rounding behavior, dates, and unknown inputs. Define monetary precision and rounding deliberately; do not rely casually on binary floating-point for currency.

The local model may explain, summarize, or reason over authoritative calculated values, but it must never replace or override them.

## Local AI boundary

Use Ollama as the local inference layer and `gemma3:12b` as the default model. Do not assume Ollama or the model is installed, loaded, or running. Invoke it only when natural-language generation or reasoning provides real value. Deterministic planning, storage, browsing of cached data, and other core functionality should continue where practical when AI is unavailable.

Treat every model response as untrusted input. Use typed structured outputs and validate them with Zod before use. Reject or safely degrade on invalid output; never trust generated JSON merely because it parses. Do not place time-sensitive financial rules only in prompts.

## Public financial data and provenance

Use public sources in this trust order:

1. government or regulator;
2. financial institution;
3. reputable comparison or financial-education source;
4. general web source;
5. forum or social source.

SerpApi is a discovery layer, not automatically a source of truth. Prefer using search results to locate and verify authoritative government, regulator, or provider pages.

Retain provenance for externally derived financial facts where practical, including:

- source name and URL;
- source type;
- retrieval timestamp;
- verification timestamp;
- confidence or trust information.

Provider integrations must tolerate website changes and fail independently. One provider failure must not discard valid data from others. Explicitly represent stale data, missing data, conflicting sources, partial refreshes, and offline state. Tests must use fixtures and must not rely on live provider websites.

## Freshness and background work

Use these default maximum ages unless a more appropriate documented policy is required:

- providers, products, and promotions: 7 days;
- country rules and government information: 30 days;
- private user profile: until the user changes it;
- plan: re-evaluate when a relevant input changes.

Do not continuously poll external services. Cache public data where appropriate and minimize SerpApi requests. If a computer was asleep when data became stale, refresh when the application next becomes active. A routine refresh alone must not produce a user notification.

## Notification policy

Interrupt only for meaningful, evidence-backed events. A user’s laziness threshold determines whether an opportunity merits attention. Suitable events include:

- an opportunity exceeding that threshold;
- a promotion nearing expiry;
- an important rule change that affects the plan;
- materially falling behind a goal;
- reaching a real progress milestone.

Motivational messages must be supported by deterministic results. Never claim that someone is ahead, on track, or at a milestone unless the calculations show it. Use the **Slowth Money** identity consistently in notification titles and copy.

## User experience

The interface should be calm, trustworthy, minimal, reassuring, and transparent. Avoid aggressive trading aesthetics, urgency theater, dark patterns, and unnecessary information density. Sloth-inspired design should communicate patience and steady progress—not carelessness.

The primary experience should answer:

- Am I on track?
- Do I need to do anything?
- If so, why is it worth my attention?
- What evidence supports the recommendation?

Explain recommendations and sources. Make material assumptions, freshness, and unknowns visible without overwhelming the user. Accessibility and clear plain language are part of correctness.

## Scope discipline

Treat the initial product as an MVP for reliable Canada-focused savings and goal planning. Do not silently expand it into:

- portfolio management or securities recommendations;
- investment trading;
- mortgage underwriting;
- tax-return preparation;
- bank integrations;
- automated financial transactions.

Future investment-advisor capabilities may be documented, but must not be implemented without explicit user direction.

## Code quality and repository practices

Use strict typing, runtime validation at system boundaries, database migrations, meaningful names, small composable modules, and tests for domain behavior. Avoid:

- `any`, except where unavoidable and documented at a narrow boundary;
- silent exception swallowing;
- giant service classes or components;
- financial/domain logic inside React components;
- hidden global mutable state;
- duplicated calculations;
- time-sensitive rules embedded in prompts;
- unnecessary dependencies.

Before a major architectural change:

1. inspect the existing repository and applicable guidance;
2. understand its conventions and current behavior;
3. identify affected components and privacy boundaries;
4. formulate a concise implementation approach;
5. implement incrementally without unrelated rewrites;
6. run proportionate validation;
7. fix failures before declaring completion.

Preserve working architecture unless there is a clear, documented reason to change it. If an important assumption is unavoidable, make it explicit in code, tests, or documentation rather than hiding it.

## Testing and completion criteria

Prioritize tests for:

- financial calculations and goal projections;
- promotions and laziness thresholds;
- freshness and progress milestones;
- source trust and conflicts;
- unknown eligibility and wrapper support;
- structured LLM-output validation and AI-unavailable behavior;
- encrypted persistence;
- provider normalization and partial failures.

Add a regression test for bug fixes when practical. Before considering substantial work complete, run the relevant formatter, linter, strict typecheck, unit/integration tests, and selected end-to-end tests. Do not hide, skip, weaken, or ignore failures to obtain a green result. Report any validation that could not be run.

## Documentation

Keep the README and architecture documentation aligned with meaningful product and architecture changes. Record important technical decisions so another engineer can understand the reasoning, privacy boundaries, failure modes, and tradeoffs. Use **Slowth Money** consistently throughout all documentation.
