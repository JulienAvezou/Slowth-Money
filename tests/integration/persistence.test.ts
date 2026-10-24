import { randomBytes } from "node:crypto";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { migrateDatabase } from "../../src/data/database/migrations";
import { ProfileCipher } from "../../src/data/encryption/profileCipher";
import { EncryptedRecordRepository } from "../../src/data/repositories/encryptedRecordRepository";
import { financialProfileSchema } from "../../src/shared/schemas/domain";
import { demoProfile } from "../../src/renderer/src/demo";

const databases: Database.Database[] = [];
afterEach(() => databases.splice(0).forEach((database) => database.close()));

describe("encrypted profile persistence", () => {
  it("round-trips a validated profile without plaintext financial values", () => {
    const database = new Database(":memory:");
    databases.push(database);
    migrateDatabase(database);
    const repository = new EncryptedRecordRepository(database, new ProfileCipher(randomBytes(32)));
    repository.set("profile", demoProfile, financialProfileSchema);
    const row = database
      .prepare("SELECT encrypted_payload FROM private_records WHERE record_key = 'profile'")
      .get() as { encrypted_payload: string };
    expect(row.encrypted_payload).not.toContain("6742000");
    expect(row.encrypted_payload).not.toContain("Ontario");
    expect(repository.get("profile", financialProfileSchema)).toEqual(demoProfile);
  });

  it("fails authentication when ciphertext is changed", () => {
    const cipher = new ProfileCipher(randomBytes(32));
    const encrypted = cipher.encrypt({ secret: 123 });
    const envelope = JSON.parse(encrypted) as { ciphertext: string };
    envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}AA`;
    expect(() => cipher.decrypt(JSON.stringify(envelope))).toThrow();
  });
});
