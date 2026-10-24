import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ElectronKeyStore,
  KeyRecoveryRequiredError,
  type ProtectedStorage,
} from "../../src/data/encryption/electronKeyStore";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function failingStorage(): ProtectedStorage {
  return {
    isEncryptionAvailable: () => true,
    decryptString: () => {
      throw new Error("macOS rejected ciphertext");
    },
    encryptString: (value) => Buffer.from(`protected:${value}`),
  };
}

describe("ElectronKeyStore recovery", () => {
  it("preserves an unreadable key and replaces it only when no encrypted data exists", () => {
    const directory = mkdtempSync(join(tmpdir(), "slowth-key-test-"));
    directories.push(directory);
    const keyPath = join(directory, "slowth-money.key");
    writeFileSync(keyPath, "unreadable-ciphertext");

    const key = new ElectronKeyStore(keyPath, failingStorage()).getOrCreateKey({
      allowReplacementIfUnreadable: true,
    });

    expect(key.byteLength).toBe(32);
    expect(readFileSync(keyPath, "utf8")).toMatch(/^protected:/);
    expect(
      readdirSync(directory).some((name) => name.startsWith("slowth-money.key.unreadable-")),
    ).toBe(true);
  });

  it("does not replace an unreadable key when encrypted records may depend on it", () => {
    const directory = mkdtempSync(join(tmpdir(), "slowth-key-test-"));
    directories.push(directory);
    const keyPath = join(directory, "slowth-money.key");
    writeFileSync(keyPath, "unreadable-ciphertext");

    expect(() =>
      new ElectronKeyStore(keyPath, failingStorage()).getOrCreateKey({
        allowReplacementIfUnreadable: false,
      }),
    ).toThrow(KeyRecoveryRequiredError);
    expect(existsSync(keyPath)).toBe(true);
    expect(readdirSync(directory)).toEqual(["slowth-money.key"]);
  });
});
