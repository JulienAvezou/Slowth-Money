import Database from "better-sqlite3";
import { migrateDatabase } from "./migrations";

export function openDatabase(path: string): Database.Database {
  const database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrateDatabase(database);
  return database;
}
