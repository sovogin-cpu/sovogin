import CryptoJS from 'crypto-js';

const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET!;

/**
 * Generates Wompi integrity signature
 * Signature = SHA256(reference + amountInCents + currency + integritySecret)
 */
export function generateWompiSignature(reference: string, amountInCents: number, currency: string = 'COP') {
  const chain = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`;
  return CryptoJS.SHA256(chain).toString(CryptoJS.enc.Hex);
}

/**
 * Generates unique payment reference
 */
export function generateReference(prefix: string = 'SOV') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
}
