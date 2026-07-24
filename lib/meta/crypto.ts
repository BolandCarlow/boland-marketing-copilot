import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";

type EncryptedPayload = { version: 1; iv: string; tag: string; ciphertext: string };

function encryptionKey() {
  const encoded = process.env.META_CREDENTIALS_ENCRYPTION_KEY;
  if (!encoded) throw new Error("META_CREDENTIALS_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("META_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

export function encryptMetaCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const payload: EncryptedPayload = { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
  return JSON.stringify(payload);
}

export function decryptMetaCredential(value: string) {
  const payload = JSON.parse(value) as EncryptedPayload;
  if (payload.version !== 1) throw new Error("Unsupported Meta credential version.");
  const decipher = createDecipheriv(algorithm, encryptionKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
