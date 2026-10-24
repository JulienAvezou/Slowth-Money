import type Database from "better-sqlite3";

export interface RefreshRecord {
  category: "FINANCIAL_PRODUCTS" | "COUNTRY_RULES";
  lastAttemptedAt: string | null;
  lastVerifiedAt: string | null;
  status: "NEVER" | "SUCCESS" | "PARTIAL" | "FAILED";
  failureSummary: string | null;
}

export class RefreshStateRepository {
  public constructor(private readonly database: Database.Database) {}

  public get(category: RefreshRecord["category"]): RefreshRecord {
    const row = this.database
      .prepare(
        `SELECT category, last_attempted_at, last_verified_at, status, failure_summary
       FROM refresh_state WHERE category = ?`,
      )
      .get(category) as
      | {
          category: RefreshRecord["category"];
          last_attempted_at: string | null;
          last_verified_at: string | null;
          status: RefreshRecord["status"];
          failure_summary: string | null;
        }
      | undefined;
    return row === undefined
      ? {
          category,
          lastAttemptedAt: null,
          lastVerifiedAt: null,
          status: "NEVER",
          failureSummary: null,
        }
      : {
          category: row.category,
          lastAttemptedAt: row.last_attempted_at,
          lastVerifiedAt: row.last_verified_at,
          status: row.status,
          failureSummary: row.failure_summary,
        };
  }

  public record(
    category: RefreshRecord["category"],
    status: RefreshRecord["status"],
    failureSummary: string | null,
    verified: boolean,
  ): void {
    const now = new Date().toISOString();
    this.database
      .prepare(
        `INSERT INTO refresh_state(category, last_attempted_at, last_verified_at, status, failure_summary)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(category) DO UPDATE SET
         last_attempted_at = excluded.last_attempted_at,
         last_verified_at = CASE WHEN excluded.last_verified_at IS NULL
           THEN refresh_state.last_verified_at ELSE excluded.last_verified_at END,
         status = excluded.status,
         failure_summary = excluded.failure_summary`,
      )
      .run(category, now, verified ? now : null, status, failureSummary);
  }
}
