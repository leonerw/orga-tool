import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  comparePassword,
  generateRefreshToken,
  getRefreshTtlMs,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
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
});