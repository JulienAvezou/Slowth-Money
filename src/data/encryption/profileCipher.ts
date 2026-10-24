import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

interface EncryptedEnvelope {
  v: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
}

export class ProfileCipher {
  public constructor(private readonly key: Buffer) {
    if (key.byteLength !== 32) throw new RangeError("Encryption key must be exactly 32 bytes.");
  }

  public encrypt(value: unknown): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(value), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const envelope: EncryptedEnvelope = {
      v: 1,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
    return JSON.stringify(envelope);
  }

  public decrypt(value: string): unknown {
    const envelope = JSON.parse(value) as Partial<EncryptedEnvelope>;
    if (
      envelope.v !== 1 ||
      envelope.algorithm !== "aes-256-gcm" ||
      typeof envelope.iv !== "string" ||
      typeof envelope.authTag !== "string" ||
      typeof envelope.ciphertext !== "string"
    ) {
      throw new Error("Unsupported or malformed encrypted record.");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString("utf8")) as unknown;
  }
}
