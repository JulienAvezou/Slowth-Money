import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { safeStorage } from "electron";

export interface ProtectedStorage {
  isEncryptionAvailable(): boolean;
  decryptString(encrypted: Buffer): string;
  encryptString(plainText: string): Buffer;
}

export interface KeyLoadOptions {
  allowReplacementIfUnreadable: boolean;
}

export class KeyRecoveryRequiredError extends Error {
  public constructor(
    public readonly keyPath: string,
    options?: ErrorOptions,
  ) {
    super(
      "The local encryption key exists but macOS could not decrypt it. Encrypted data has been preserved and cannot be opened until the key is recovered or the local data is reset.",
      options,
    );
    this.name = "KeyRecoveryRequiredError";
  }
}

export class ElectronKeyStore {
  public constructor(
    private readonly keyPath: string,
    private readonly storage: ProtectedStorage = safeStorage,
  ) {}

  public getOrCreateKey(options: KeyLoadOptions): Buffer {
    if (!this.storage.isEncryptionAvailable()) {
      throw new Error(
        "Secure profile storage is unavailable. Slowth Money will not persist private data insecurely.",
      );
    }
    if (existsSync(this.keyPath)) {
      try {
        const decrypted = this.storage.decryptString(readFileSync(this.keyPath));
        const key = Buffer.from(decrypted, "base64");
        if (key.byteLength !== 32) throw new Error("The decrypted key has an invalid length.");
        return key;
      } catch (cause) {
        if (!options.allowReplacementIfUnreadable) {
          throw new KeyRecoveryRequiredError(this.keyPath, {
            cause: cause instanceof Error ? cause : undefined,
          });
        }
        this.preserveUnreadableKey();
      }
    }
    return this.createKey();
  }

  private createKey(): Buffer {
    const key = randomBytes(32);
    writeFileSync(this.keyPath, this.storage.encryptString(key.toString("base64")), {
      mode: 0o600,
    });
    return key;
  }

  private preserveUnreadableKey(): void {
    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
    renameSync(this.keyPath, `${this.keyPath}.unreadable-${timestamp}`);
  }
}
