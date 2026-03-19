import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  comparePassword,
  generateRefreshToken,
  getRefreshTtlMs,
  hashBackupCode,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  signEmailVerifyToken,
  signTwoFactorPendingToken,
  verifyAccessToken,
  verifyEmailVerifyToken,
  verifyTwoFactorPendingToken,
} from "../src/utils/auth.js";

describe("auth utils", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("hashes and verifies password correctly", async () => {
    const hash = await hashPassword("Password123");
    expect(hash).not.toBe("Password123");

    await expect(comparePassword("Password123", hash)).resolves.toBe(true);
    await expect(comparePassword("WrongPassword", hash)).resolves.toBe(false);
  });

  it("signs and verifies access token when secret is configured", () => {
    vi.stubEnv("ACCESS_TOKEN_SECRET", "test-secret");
    vi.stubEnv("ACCESS_TOKEN_TTL", "15m");

    const token = signAccessToken({
      _id: { toString: () => "user-1" },
      email: "alice@example.com",
    });

    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("alice@example.com");
  });

  it("throws when ACCESS_TOKEN_SECRET is missing", () => {
    vi.stubEnv("ACCESS_TOKEN_SECRET", "");

    expect(() =>
      signAccessToken({
        _id: { toString: () => "user-1" },
        email: "alice@example.com",
      })
    ).toThrow("ACCESS_TOKEN_SECRET is not configured");
  });

  it("generates secure random refresh tokens", () => {
    const tokenA = generateRefreshToken();
    const tokenB = generateRefreshToken();

    expect(tokenA).toMatch(/^[a-f0-9]+$/);
    expect(tokenA.length).toBe(128);
    expect(tokenB).toMatch(/^[a-f0-9]+$/);
    expect(tokenB.length).toBe(128);
    expect(tokenA).not.toBe(tokenB);
  });

  it("hashes refresh tokens deterministically", () => {
    const input = "my-refresh-token";
    const hash1 = hashRefreshToken(input);
    const hash2 = hashRefreshToken(input);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(input);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("computes refresh TTL from configured env values", () => {
    vi.stubEnv("REFRESH_TOKEN_TTL_REMEMBER_DAYS", "30");
    vi.stubEnv("REFRESH_TOKEN_TTL_SESSION_DAYS", "2");

    expect(getRefreshTtlMs(true)).toBe(30 * 24 * 60 * 60 * 1000);
    expect(getRefreshTtlMs(false)).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it("falls back to default refresh TTL values when env is unset", () => {
    delete process.env.REFRESH_TOKEN_TTL_REMEMBER_DAYS;
    delete process.env.REFRESH_TOKEN_TTL_SESSION_DAYS;

    expect(getRefreshTtlMs(true)).toBe(30 * 24 * 60 * 60 * 1000);
    expect(getRefreshTtlMs(false)).toBe(1 * 24 * 60 * 60 * 1000);
  });

  // ─── email verify token ───────────────────────────────────────────────────────

  it("signs and verifies email verify token", () => {
    vi.stubEnv("EMAIL_VERIFY_SECRET", "email-secret");

    const token = signEmailVerifyToken("user-123");
    const payload = verifyEmailVerifyToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.type).toBe("email_verify");
  });

  it("throws when verifyEmailVerifyToken receives a token of the wrong type", () => {
    vi.stubEnv("EMAIL_VERIFY_SECRET", "shared-secret");
    vi.stubEnv("TWO_FACTOR_PENDING_SECRET", "shared-secret");

    // sign a 2fa_pending token and try to use it as an email verify token
    const token = signTwoFactorPendingToken("user-123", false);
    expect(() => verifyEmailVerifyToken(token)).toThrow("Invalid token type");
  });

  it("throws when EMAIL_VERIFY_SECRET is missing", () => {
    vi.stubEnv("EMAIL_VERIFY_SECRET", "");
    expect(() => signEmailVerifyToken("user-123")).toThrow("EMAIL_VERIFY_SECRET is not configured");
  });

  // ─── 2FA pending token ────────────────────────────────────────────────────────

  it("signs and verifies 2FA pending token, preserving rememberMe", () => {
    vi.stubEnv("TWO_FACTOR_PENDING_SECRET", "2fa-secret");

    const token = signTwoFactorPendingToken("user-123", true);
    const payload = verifyTwoFactorPendingToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.type).toBe("2fa_pending");
    expect(payload.rememberMe).toBe(true);
  });

  it("throws when verifyTwoFactorPendingToken receives a token of the wrong type", () => {
    vi.stubEnv("EMAIL_VERIFY_SECRET", "shared-secret");
    vi.stubEnv("TWO_FACTOR_PENDING_SECRET", "shared-secret");

    // sign an email_verify token and try to use it as a 2fa_pending token
    const token = signEmailVerifyToken("user-123");
    expect(() => verifyTwoFactorPendingToken(token)).toThrow("Invalid token type");
  });

  it("throws when TWO_FACTOR_PENDING_SECRET is missing", () => {
    vi.stubEnv("TWO_FACTOR_PENDING_SECRET", "");
    expect(() => signTwoFactorPendingToken("user-123", false)).toThrow("TWO_FACTOR_PENDING_SECRET is not configured");
  });

  // ─── hashBackupCode ───────────────────────────────────────────────────────────

  it("hashes backup codes deterministically as SHA-256", () => {
    const hash1 = hashBackupCode("mybackupcode");
    const hash2 = hashBackupCode("mybackupcode");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe("mybackupcode");
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different backup codes", () => {
    expect(hashBackupCode("code1")).not.toBe(hashBackupCode("code2"));
  });
});