import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Saved Apify tokens and SMTP passwords are encrypted at rest with a key derived
// from SESSION_SECRET (AES-256-GCM). Rotating SESSION_SECRET makes them unreadable.
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHash("sha256").update(`esylivo-reach:${secret}`).digest();
}

export function encrypt(plain: string) {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decrypt(stored: string) {
  if (!stored) return "";
  try {
    const [, iv, tag, data] = stored.split(".");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

/** "abcd…wxyz" for showing that a secret is saved without revealing it. */
export function mask(plain: string) {
  if (!plain) return "";
  return plain.length <= 8 ? "••••••" : `${plain.slice(0, 4)}…${plain.slice(-4)}`;
}
