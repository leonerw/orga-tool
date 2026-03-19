import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/models/user.model.js", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../src/models/auth-session.model.js", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("../src/utils/auth.js", () => ({
  comparePassword: vi.fn(),
  generateRefreshToken: vi.fn(),
  getRefreshTtlMs: vi.fn(),
  hashPassword: vi.fn(),
  hashRefreshToken: vi.fn(),
  hashBackupCode: vi.fn(),
  signAccessToken: vi.fn(),
  verifyAccessToken: vi.fn(),
  signEmailVerifyToken: vi.fn(),
  verifyEmailVerifyToken: vi.fn(),
  signTwoFactorPendingToken: vi.fn(),
  verifyTwoFactorPendingToken: vi.fn(),
}));

vi.mock("../src/utils/auth-cookie.js", () => ({
  REFRESH_COOKIE_NAME: "refreshToken",
  setRefreshTokenCookie: vi.fn(),
  clearRefreshTokenCookie: vi.fn(),
}));

vi.mock("../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/utils/totp.js", () => ({
  verifyTotpCode: vi.fn(),
}));

import User from "../src/models/user.model.js";
import AuthSession from "../src/models/auth-session.model.js";
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
  verifyEmailVerifyToken,
  verifyTwoFactorPendingToken,
} from "../src/utils/auth.js";
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../src/utils/auth-cookie.js";
import { verifyTotpCode } from "../src/utils/totp.js";
import {
  changePassword,
  login,
  loginWithTwoFactor,
  logout,
  me,
  recoverWithBackupCode,
  refresh,
  register,
  resendVerificationEmail,
  verifyEmail,
} from "../src/controllers/auth.controller.js";

const userId = "507f191e810c19729de860ea";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = ({ body = {}, cookies = {}, headers = {}, ip = "127.0.0.1", auth = null, query = {} } = {}) => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  return {
    body,
    cookies,
    ip,
    auth,
    query,
    get: (name) => normalizedHeaders[name.toLowerCase()] || "",
  };
};

const makeUser = (overrides = {}) => ({
  _id: userId,
  email: "alice@example.com",
  displayName: "Alice",
  passwordHash: "stored-hash",
  emailVerified: false,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  backupCodeHashes: [],
  save: vi.fn().mockResolvedValue({}),
  ...overrides,
});

// Expected shape of sanitized user in responses
const sanitizedAlice = {
  id: userId,
  email: "alice@example.com",
  displayName: "Alice",
  emailVerified: false,
  twoFactorEnabled: false,
};

const makeSession = (overrides = {}) => ({
  _id: "session-id",
  userId,
  rememberMe: false,
  revokedAt: null,
  expiresAt: new Date(Date.now() + 10_000),
  ...overrides,
});

describe("auth.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    signAccessToken.mockReturnValue("access-token");
    generateRefreshToken.mockReturnValue("refresh-token");
    hashRefreshToken.mockReturnValue("refresh-hash");
    getRefreshTtlMs.mockReturnValue(3_600_000);
    hashPassword.mockResolvedValue("password-hash");
    comparePassword.mockResolvedValue(true);
    signEmailVerifyToken.mockReturnValue("email-verify-token");
    signTwoFactorPendingToken.mockReturnValue("pending-token");
    verifyEmailVerifyToken.mockReturnValue({ sub: userId, type: "email_verify" });
    verifyTwoFactorPendingToken.mockReturnValue({ sub: userId, type: "2fa_pending", rememberMe: false });
    hashBackupCode.mockReturnValue("backup-hash");
    verifyTotpCode.mockReturnValue(true);

    AuthSession.create.mockResolvedValue({});
    AuthSession.updateOne.mockResolvedValue({ acknowledged: true });
    AuthSession.updateMany.mockResolvedValue({ acknowledged: true });
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe("register", () => {
    it("returns 400 when required fields are missing", async () => {
      const req = mockReq({ body: { email: "", password: "", displayName: "" } });
      const res = mockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email, password and displayName are required",
      });
    });

    it("returns 400 when password is too short", async () => {
      const req = mockReq({
        body: { email: "alice@example.com", password: "short", displayName: "Alice" },
      });
      const res = mockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password must be at least 8 characters",
      });
    });

    it("returns 409 when email already exists", async () => {
      User.findOne.mockResolvedValue(makeUser());

      const req = mockReq({
        body: { email: "alice@example.com", password: "Password123", displayName: "Alice" },
      });
      const res = mockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: "Email already in use" });
    });

    it("creates user + session and returns access token", async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(makeUser());

      const req = mockReq({
        body: {
          email: "alice@example.com",
          password: "Password123",
          displayName: "Alice",
          rememberMe: true,
        },
        headers: { "user-agent": "unit-test-agent" },
      });
      const res = mockRes();

      await register(req, res);

      expect(hashPassword).toHaveBeenCalledWith("Password123");
      expect(User.create).toHaveBeenCalledWith({
        email: "alice@example.com",
        passwordHash: "password-hash",
        displayName: "Alice",
      });

      expect(AuthSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          refreshTokenHash: "refresh-hash",
          rememberMe: true,
          userAgent: "unit-test-agent",
          ip: "127.0.0.1",
        })
      );

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token", expect.any(Number));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: sanitizedAlice,
      });
    });

    it("returns 500 on unexpected register error", async () => {
      User.findOne.mockRejectedValue(new Error("db down"));

      const req = mockReq({
        body: { email: "alice@example.com", password: "Password123", displayName: "Alice" },
      });
      const res = mockRes();

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error registering user" });
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("returns 400 when email/password are missing", async () => {
      const req = mockReq({ body: { email: "", password: "" } });
      const res = mockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email and password are required" });
    });

    it("returns 401 when user does not exist", async () => {
      User.findOne.mockResolvedValue(null);

      const req = mockReq({ body: { email: "alice@example.com", password: "Password123" } });
      const res = mockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("returns 401 when password is wrong", async () => {
      User.findOne.mockResolvedValue(makeUser());
      comparePassword.mockResolvedValue(false);

      const req = mockReq({ body: { email: "alice@example.com", password: "WrongPassword" } });
      const res = mockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("creates session and returns token on successful login", async () => {
      User.findOne.mockResolvedValue(makeUser());

      const req = mockReq({
        body: { email: "alice@example.com", password: "Password123", rememberMe: false },
        headers: { "user-agent": "unit-test-agent" },
      });
      const res = mockRes();

      await login(req, res);

      expect(AuthSession.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, rememberMe: false })
      );
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token", expect.any(Number));
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: sanitizedAlice,
      });
    });

    it("returns otp_required step when user has 2FA enabled", async () => {
      User.findOne.mockResolvedValue(makeUser({ twoFactorEnabled: true, twoFactorSecret: "SECRET" }));

      const req = mockReq({
        body: { email: "alice@example.com", password: "Password123", rememberMe: true },
      });
      const res = mockRes();

      await login(req, res);

      expect(signTwoFactorPendingToken).toHaveBeenCalledWith(userId, true);
      expect(AuthSession.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ step: "otp_required", pendingToken: "pending-token" });
    });

    it("returns 500 on unexpected login error", async () => {
      User.findOne.mockRejectedValue(new Error("db down"));

      const req = mockReq({ body: { email: "alice@example.com", password: "Password123" } });
      const res = mockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error logging in" });
    });
  });

  // ─── refresh ──────────────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("returns 401 when refresh token cookie is missing", async () => {
      const req = mockReq();
      const res = mockRes();

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Refresh token missing" });
    });

    it("returns 401 when refresh session does not exist", async () => {
      AuthSession.findOne.mockResolvedValue(null);

      const req = mockReq({ cookies: { refreshToken: "rt" } });
      const res = mockRes();

      await refresh(req, res);

      expect(hashRefreshToken).toHaveBeenCalledWith("rt");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh session" });
    });

    it("revokes all sessions and clears cookie when a revoked token is reused", async () => {
      AuthSession.findOne.mockResolvedValue(makeSession({ revokedAt: new Date() }));

      const req = mockReq({ cookies: { refreshToken: "rt" } });
      const res = mockRes();

      await refresh(req, res);

      expect(AuthSession.updateMany).toHaveBeenCalledWith(
        { userId, revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } }
      );
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh session" });
    });

    it("revokes and clears cookie when refresh session is expired", async () => {
      AuthSession.findOne.mockResolvedValue(
        makeSession({ expiresAt: new Date(Date.now() - 1_000) })
      );

      const req = mockReq({ cookies: { refreshToken: "rt" } });
      const res = mockRes();

      await refresh(req, res);

      expect(AuthSession.updateOne).toHaveBeenCalledWith(
        { _id: "session-id" },
        { $set: { revokedAt: expect.any(Date) } }
      );
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Refresh session expired" });
    });

    it("revokes and clears cookie when session user no longer exists", async () => {
      AuthSession.findOne.mockResolvedValue(makeSession());
      User.findById.mockResolvedValue(null);

      const req = mockReq({ cookies: { refreshToken: "rt" } });
      const res = mockRes();

      await refresh(req, res);

      expect(AuthSession.updateOne).toHaveBeenCalledWith(
        { _id: "session-id" },
        { $set: { revokedAt: expect.any(Date) } }
      );
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid refresh session" });
    });

    it("rotates session and returns new access token", async () => {
      AuthSession.findOne.mockResolvedValue(makeSession({ _id: "old-session" }));
      User.findById.mockResolvedValue(makeUser());

      const req = mockReq({
        cookies: { refreshToken: "rt" },
        headers: { "user-agent": "unit-test-agent" },
      });
      const res = mockRes();

      await refresh(req, res);

      expect(AuthSession.updateOne).toHaveBeenCalledWith(
        { _id: "old-session" },
        { $set: { revokedAt: expect.any(Date) } }
      );
      expect(AuthSession.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, rememberMe: false, refreshTokenHash: "refresh-hash" })
      );
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token", expect.any(Number));
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: sanitizedAlice,
      });
    });

    it("returns 500 on unexpected refresh error", async () => {
      AuthSession.findOne.mockRejectedValue(new Error("db down"));

      const req = mockReq({ cookies: { refreshToken: "rt" } });
      const res = mockRes();

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error refreshing session" });
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("revokes current session when refresh token cookie exists", async () => {
      const req = mockReq({ cookies: { refreshToken: "rt" } });
      const res = mockRes();

      await logout(req, res);

      expect(hashRefreshToken).toHaveBeenCalledWith("rt");
      expect(AuthSession.updateOne).toHaveBeenCalledWith(
        { refreshTokenHash: "refresh-hash", revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } }
      );
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("clears cookie even if refresh token cookie is missing", async () => {
      const req = mockReq();
      const res = mockRes();

      await logout(req, res);

      expect(AuthSession.updateOne).not.toHaveBeenCalled();
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("returns 500 on unexpected logout error", async () => {
      AuthSession.updateOne.mockRejectedValue(new Error("db down"));

      const req = mockReq({ cookies: { refreshToken: "rt" } });
      const res = mockRes();

      await logout(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error logging out" });
    });
  });

  // ─── me ───────────────────────────────────────────────────────────────────────

  describe("me", () => {
    it("returns user for valid auth", async () => {
      User.findById.mockResolvedValue(makeUser());

      const req = mockReq({ auth: { userId, email: "alice@example.com" } });
      const res = mockRes();

      await me(req, res);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(res.json).toHaveBeenCalledWith({ user: sanitizedAlice });
    });

    it("returns 401 when user is not found", async () => {
      User.findById.mockResolvedValue(null);

      const req = mockReq({ auth: { userId, email: "alice@example.com" } });
      const res = mockRes();

      await me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("returns 500 on unexpected error", async () => {
      User.findById.mockRejectedValue(new Error("db down"));

      const req = mockReq({ auth: { userId, email: "alice@example.com" } });
      const res = mockRes();

      await me(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error fetching user" });
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────────

  describe("changePassword", () => {
    it("returns 400 when fields are missing", async () => {
      const req = mockReq({ auth: { userId }, body: { currentPassword: "", newPassword: "" } });
      const res = mockRes();

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when new password is too short", async () => {
      const req = mockReq({ auth: { userId }, body: { currentPassword: "oldpass", newPassword: "short" } });
      const res = mockRes();

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "New password must be at least 8 characters" });
    });

    it("returns 401 when current password is wrong", async () => {
      User.findById.mockResolvedValue(makeUser());
      comparePassword.mockResolvedValue(false);

      const req = mockReq({
        auth: { userId },
        body: { currentPassword: "wrongpass", newPassword: "newPassword123" },
      });
      const res = mockRes();

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Current password is incorrect" });
    });

    it("returns 400 when new password equals current password", async () => {
      User.findById.mockResolvedValue(makeUser());

      const req = mockReq({
        auth: { userId },
        body: { currentPassword: "SamePass1", newPassword: "SamePass1" },
      });
      const res = mockRes();

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "New password must differ from current password" });
    });

    it("changes password, revokes other sessions, keeps current", async () => {
      const userObj = makeUser();
      User.findById.mockResolvedValue(userObj);
      const currentSession = { _id: "current-session" };
      AuthSession.findOne.mockResolvedValue(currentSession);

      const req = mockReq({
        auth: { userId },
        body: { currentPassword: "oldpassword", newPassword: "newPassword123" },
        cookies: { refreshToken: "rt" },
      });
      const res = mockRes();

      await changePassword(req, res);

      expect(hashPassword).toHaveBeenCalledWith("newPassword123");
      expect(userObj.save).toHaveBeenCalled();
      expect(AuthSession.updateMany).toHaveBeenCalledWith(
        { userId, revokedAt: null, _id: { $ne: "current-session" } },
        { $set: { revokedAt: expect.any(Date) } }
      );
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("revokes all sessions when no refresh cookie is present", async () => {
      User.findById.mockResolvedValue(makeUser());
      AuthSession.findOne.mockResolvedValue(null);

      const req = mockReq({
        auth: { userId },
        body: { currentPassword: "oldpassword", newPassword: "newPassword123" },
      });
      const res = mockRes();

      await changePassword(req, res);

      // No _id exclusion when there is no current session
      expect(AuthSession.updateMany).toHaveBeenCalledWith(
        { userId, revokedAt: null },
        { $set: { revokedAt: expect.any(Date) } }
      );
    });
  });

  // ─── verifyEmail ──────────────────────────────────────────────────────────────

  describe("verifyEmail", () => {
    it("returns 400 when token is missing", async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Verification token missing" });
    });

    it("sets emailVerified on valid token", async () => {
      const req = mockReq({ query: { token: "valid-token" } });
      const res = mockRes();

      await verifyEmail(req, res);

      expect(verifyEmailVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(User.updateOne).toHaveBeenCalledWith({ _id: userId }, { $set: { emailVerified: true } });
      expect(res.json).toHaveBeenCalledWith({ message: "Email verified successfully" });
    });

    it("returns 400 when token is invalid", async () => {
      verifyEmailVerifyToken.mockImplementation(() => { throw new Error("bad token"); });

      const req = mockReq({ query: { token: "bad-token" } });
      const res = mockRes();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired verification link" });
    });
  });

  // ─── resendVerificationEmail ──────────────────────────────────────────────────

  describe("resendVerificationEmail", () => {
    it("returns 400 when email is already verified", async () => {
      User.findById.mockResolvedValue(makeUser({ emailVerified: true }));

      const req = mockReq({ auth: { userId } });
      const res = mockRes();

      await resendVerificationEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email is already verified" });
    });

    it("returns 401 when user is not found", async () => {
      User.findById.mockResolvedValue(null);

      const req = mockReq({ auth: { userId } });
      const res = mockRes();

      await resendVerificationEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("sends verification email for unverified user", async () => {
      User.findById.mockResolvedValue(makeUser());
      const { sendVerificationEmail } = await import("../src/utils/email.js");

      const req = mockReq({ auth: { userId } });
      const res = mockRes();

      await resendVerificationEmail(req, res);

      expect(signEmailVerifyToken).toHaveBeenCalledWith(userId);
      expect(sendVerificationEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  // ─── loginWithTwoFactor ───────────────────────────────────────────────────────

  describe("loginWithTwoFactor", () => {
    it("returns 400 when fields are missing", async () => {
      const req = mockReq({ body: { pendingToken: "", code: "" } });
      const res = mockRes();

      await loginWithTwoFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 401 when pending token is invalid", async () => {
      verifyTwoFactorPendingToken.mockImplementation(() => { throw new Error("bad token"); });

      const req = mockReq({ body: { pendingToken: "bad", code: "123456" } });
      const res = mockRes();

      await loginWithTwoFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 401 when user not found", async () => {
      User.findById.mockResolvedValue(null);

      const req = mockReq({ body: { pendingToken: "valid-pending", code: "123456" } });
      const res = mockRes();

      await loginWithTwoFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 401 when user does not have 2FA enabled", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: false }));

      const req = mockReq({ body: { pendingToken: "valid-pending", code: "123456" } });
      const res = mockRes();

      await loginWithTwoFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid session" });
    });

    it("returns 401 when TOTP code is wrong", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true, twoFactorSecret: "SECRET" }));
      verifyTotpCode.mockReturnValue(false);

      const req = mockReq({ body: { pendingToken: "valid-pending", code: "000000" } });
      const res = mockRes();

      await loginWithTwoFactor(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid code" });
    });

    it("creates session and returns token on valid code", async () => {
      User.findById.mockResolvedValue(makeUser({ twoFactorEnabled: true, twoFactorSecret: "SECRET" }));

      const req = mockReq({
        body: { pendingToken: "valid-pending", code: "123456" },
        headers: { "user-agent": "unit-test-agent" },
      });
      const res = mockRes();

      await loginWithTwoFactor(req, res);

      expect(AuthSession.create).toHaveBeenCalled();
      expect(setRefreshTokenCookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: { ...sanitizedAlice, twoFactorEnabled: true },
      });
    });
  });

  // ─── recoverWithBackupCode ────────────────────────────────────────────────────

  describe("recoverWithBackupCode", () => {
    it("returns 400 when fields are missing", async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();

      await recoverWithBackupCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Pending token and backup code are required" });
    });

    it("returns 401 when pending token is invalid", async () => {
      verifyTwoFactorPendingToken.mockImplementation(() => { throw new Error("bad token"); });

      const req = mockReq({ body: { pendingToken: "bad", backupCode: "abcdef12" } });
      const res = mockRes();

      await recoverWithBackupCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 401 when backup code is not in the list", async () => {
      const userObj = makeUser({ twoFactorEnabled: true, backupCodeHashes: ["other-hash"] });
      User.findById.mockResolvedValue(userObj);
      hashBackupCode.mockReturnValue("no-match-hash");

      const req = mockReq({ body: { pendingToken: "valid-pending", backupCode: "wrongcode" } });
      const res = mockRes();

      await recoverWithBackupCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid backup code" });
    });

    it("invalidates the backup code and creates session", async () => {
      const userObj = makeUser({ twoFactorEnabled: true, backupCodeHashes: ["backup-hash"] });
      User.findById.mockResolvedValue(userObj);

      const req = mockReq({
        body: { pendingToken: "valid-pending", backupCode: "validcode" },
        headers: { "user-agent": "unit-test-agent" },
      });
      const res = mockRes();

      await recoverWithBackupCode(req, res);

      expect(userObj.save).toHaveBeenCalled();
      expect(userObj.backupCodeHashes).toHaveLength(0); // consumed
      expect(AuthSession.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: { ...sanitizedAlice, twoFactorEnabled: true },
      });
    });
  });
});
