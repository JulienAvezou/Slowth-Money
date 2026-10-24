import type Database from "better-sqlite3";

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "001_initial",
    sql: `
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS private_records (
        record_key TEXT PRIMARY KEY,
        encrypted_payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS goal_snapshots (
        id TEXT PRIMARY KEY,
        encrypted_payload TEXT NOT NULL,
        captured_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS source_records (
        id TEXT PRIMARY KEY,
        source_url TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        last_verified_at TEXT NOT NULL,
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1)
      );

      CREATE TABLE IF NOT EXISTS public_facts (
        id TEXT PRIMARY KEY,
        jurisdiction TEXT NOT NULL,
        concept TEXT NOT NULL,
        effective_year INTEGER,
        value_json TEXT NOT NULL,
        source_id TEXT NOT NULL REFERENCES source_records(id),
        conflict_state TEXT NOT NULL DEFAULT 'NONE',
        version INTEGER NOT NULL,
        UNIQUE(jurisdiction, concept, effective_year, version)
      );

      CREATE TABLE IF NOT EXISTS financial_products (
        id TEXT PRIMARY KEY,
        normalized_json TEXT NOT NULL,
        source_id TEXT NOT NULL REFERENCES source_records(id),
        retrieved_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS refresh_state (
        category TEXT PRIMARY KEY,
        last_attempted_at TEXT,
        last_verified_at TEXT,
        status TEXT NOT NULL,
        failure_summary TEXT
      );

      CREATE TABLE IF NOT EXISTS search_cache (
        query_hash TEXT PRIMARY KEY,
        public_query TEXT NOT NULL,
        response_json TEXT NOT NULL,
        retrieved_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS search_usage (
        month TEXT PRIMARY KEY,
        search_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recommendations (
        id TEXT PRIMARY KEY,
        recommendation_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        dismissed_at TEXT
      );
    `,
  },
];

export function migrateDatabase(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set(
    database
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => (row as { version: number }).version),
  );
  const apply = database.transaction((migration: Migration) => {
    database.exec(migration.sql);
    database
      .prepare("INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)")
      .run(migration.version, migration.name, new Date().toISOString());
  });
  for (const migration of migrations) {
    if (!applied.has(migration.version)) apply(migration);
  }
}
