import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const rawKey =
    process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error(
      "OUTLOOK_TOKEN_ENCRYPTION_KEY is missing."
    );
  }

  const key =
    Buffer.from(rawKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "OUTLOOK_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes."
    );
  }

  return key;
}

export function encryptText(
  plaintext: string
) {
  const key =
    getEncryptionKey();

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        plaintext,
        "utf8"
      ),
      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptText(
  encryptedValue: string
) {
  const [
    version,
    ivValue,
    tagValue,
    ciphertextValue,
  ] = encryptedValue.split(".");

  if (
    version !== "v1" ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue
  ) {
    throw new Error(
      "Invalid encrypted token cache."
    );
  }

  const key =
    getEncryptionKey();

  const iv =
    Buffer.from(
      ivValue,
      "base64url"
    );

  const authTag =
    Buffer.from(
      tagValue,
      "base64url"
    );

  const ciphertext =
    Buffer.from(
      ciphertextValue,
      "base64url"
    );

  const decipher =
    createDecipheriv(
      ALGORITHM,
      key,
      iv
    );

  decipher.setAuthTag(
    authTag
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        ciphertext
      ),
      decipher.final(),
    ]);

  return decrypted.toString(
    "utf8"
  );
}