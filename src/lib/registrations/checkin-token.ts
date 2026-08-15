import crypto from "crypto";

const TOKEN_PREFIX = "SOV-CK-";

/**
 * Genera un token opaco y de alta entropía server-side.
 * Formato: SOV-CK-<64 caracteres hex> (256 bits de aleatoriedad)
 */
export function generateCheckInToken(): string {
  const randomBuffer = crypto.randomBytes(32);
  return `${TOKEN_PREFIX}${randomBuffer.toString("hex")}`;
}

/**
 * Calcula el hash SHA-256 de un token plano para almacenamiento seguro en la BD.
 */
export function hashCheckInToken(token: string): string {
  const cleanToken = token.trim();
  return crypto.createHash("sha256").update(cleanToken).digest("hex");
}

/**
 * Valida si el string cumple con la estructura esperada de un token de check-in de SOVOGIN.
 */
export function isValidCheckInTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const clean = token.trim();
  const pattern = /^SOV-CK-[a-fA-F0-9]{64}$/;
  return pattern.test(clean);
}
