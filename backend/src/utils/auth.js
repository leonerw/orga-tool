import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// --- Private config helpers ---
// These read env vars at call time so tests can override them without restarting.

const getAccessTokenSecret = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not configured");
  return secret;
};

const getEmailVerifySecret = () => {
  const secret = process.env.EMAIL_VERIFY_SECRET;
  if (!secret) throw new Error("EMAIL_VERIFY_SECRET is not configured");
  return secret;
};

const getTwoFactorPendingSecret = () => {
  const secret = process.env.TWO_FACTOR_PENDING_SECRET;
  if (!secret) throw new Error("TWO_FACTOR_PENDING_SECRET is not configured");
  return secret;
};

const getAccessTokenTtl = () => process.env.ACCESS_TOKEN_TTL || "15m";
const getRememberDays = () => Number(process.env.REFRESH_TOKEN_TTL_REMEMBER_DAYS || 30);
const getSessionDays = () => Number(process.env.REFRESH_TOKEN_TTL_SESSION_DAYS || 1);

// --- Password ---

export const hashPassword = async (password) => bcrypt.hash(password, 12);
export const comparePassword = async (password, passwordHash) => bcrypt.compare(password, passwordHash);

// --- Access tokens ---

export const signAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), email: user.email },
    getAccessTokenSecret(),
    { expiresIn: getAccessTokenTtl() }
  );

export const verifyAccessToken = (token) =>
  jwt.verify(token, getAccessTokenSecret());

// --- Refresh tokens ---

export const generateRefreshToken = () =>
  crypto.randomBytes(64).toString("hex");

// Raw token is never stored — only the SHA-256 hash is persisted in AuthSession.
export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getRefreshTtlMs = (rememberMe) =>
  (rememberMe ? getRememberDays() : getSessionDays()) * 24 * 60 * 60 * 1000;

// --- Email verification tokens ---

export const signEmailVerifyToken = (userId) =>
  jwt.sign({ sub: userId.toString(), type: "email_verify" }, getEmailVerifySecret(), { expiresIn: "24h" });

export const verifyEmailVerifyToken = (token) => {
  const payload = jwt.verify(token, getEmailVerifySecret());
  if (payload.type !== "email_verify") throw new Error("Invalid token type");
  return payload;
};

// --- 2FA pending tokens ---
// Issued after a successful password check when 2FA is enabled.
// Short-lived (5 min) — carries the user ID and rememberMe preference
// until the OTP step completes and a full session is created.

export const signTwoFactorPendingToken = (userId, rememberMe) =>
  jwt.sign(
    { sub: userId.toString(), type: "2fa_pending", rememberMe: Boolean(rememberMe) },
    getTwoFactorPendingSecret(),
    { expiresIn: "5m" }
  );

export const verifyTwoFactorPendingToken = (token) => {
  const payload = jwt.verify(token, getTwoFactorPendingSecret());
  if (payload.type !== "2fa_pending") throw new Error("Invalid token type");
  return payload;
};

// --- Backup codes ---

// Plain codes are returned to the user once. Only their hashes are stored.
export const hashBackupCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");
