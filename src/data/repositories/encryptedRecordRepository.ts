import type Database from "better-sqlite3";
import type { ZodType } from "zod";
import type { ProfileCipher } from "../encryption/profileCipher";

export class EncryptedRecordRepository {
  public constructor(
    private readonly database: Database.Database,
    private readonly cipher: ProfileCipher,
  ) {}

  public get<T>(key: string, schema: ZodType<T>): T | null {
    const row = this.database
      .prepare("SELECT encrypted_payload FROM private_records WHERE record_key = ?")
      .get(key) as { encrypted_payload: string } | undefined;
    if (row === undefined) return null;
    return schema.parse(this.cipher.decrypt(row.encrypted_payload));
  }

  public set<T>(key: string, value: T, schema: ZodType<T>): T {
    const validated = schema.parse(value);
    const encrypted = this.cipher.encrypt(validated);
    this.database
      .prepare(
        `INSERT INTO private_records(record_key, encrypted_payload, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(record_key) DO UPDATE SET
           encrypted_payload = excluded.encrypted_payload,
           updated_at = excluded.updated_at`,
      )
      .run(key, encrypted, new Date().toISOString());
    return validated;
  }

  public deleteAllPrivateData(): void {
    this.database.transaction(() => {
      this.database.prepare("DELETE FROM private_records").run();
      this.database.prepare("DELETE FROM goal_snapshots").run();
      this.database.prepare("DELETE FROM recommendations").run();
      this.database.prepare("DELETE FROM activities").run();
    })();
  }
}
