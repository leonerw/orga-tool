import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import crypto from "crypto";

const ISSUER = "Orga-Tool";

export function generateTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

export async function generateQrCodeDataUrl(email, secretBase32) {
  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
  return QRCode.toDataURL(totp.toString());
}

export function verifyTotpCode(secretBase32, code) {
  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
  // window: 1 allows ±30s clock drift
  return totp.validate({ token: code, window: 1 }) !== null;
}

export function generateBackupCodes(count = 10) {
  return Array.from({ length: count }, () => crypto.randomBytes(4).toString("hex"));
}
