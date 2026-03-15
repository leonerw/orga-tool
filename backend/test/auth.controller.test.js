import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/models/user.model.js", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../src/models/auth-session.model.js", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../src/utils/auth.js", () => ({
  comparePassword: vi.fn(),
  generateRefreshToken: vi.fn(),
  getRefreshTtlMs: vi.fn(),
  hashPassword: vi.fn(),
  hashRefreshToken: vi.fn(),
  signAccessToken: vi.fn(),
  verifyAccessToken: vi.fn(),
}));

vi.mock("../src/utils/auth-cookie.js", () => ({
  REFRESH_COOKIE_NAME: "refreshToken",
  setRefreshTokenCookie: vi.fn(),
  clearRefreshTokenCookie: vi.fn(),
}));

import User from "../src/models/user.model.js";
import AuthSession from "../src/models/auth-session.model.js";
import {
  comparePassword,
  generateRefreshToken,
  getRefreshTtlMs,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "../src/utils/auth.js";
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../src/utils/auth-cookie.js";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../src/controllers/auth.controller.js";

const userId = "507f191e810c19729de860ea";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = ({ body = {}, cookies = {}, headers = {}, ip = "127.0.0.1" } = {}) => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );

  return {
    body,
    cookies,
    ip,
    get: (name) => normalizedHeaders[name.toLowerCase()] || "",
  };
};

const makeUser = (overrides = {}) => ({
  _id: userId,
  email: "alice@example.com",
  displayName: "Alice",
  passwordHash: "stored-hash",
  ...overrides,
});

describe("auth.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    signAccessToken.mockReturnValue("access-token");
    generateRefreshToken.mockReturnValue("refresh-token");
    hashRefreshToken.mockReturnValue("refresh-hash");
    getRefreshTtlMs.mockReturnValue(3600000);
    hashPassword.mockResolvedValue("password-hash");
    comparePassword.mockResolvedValue(true);
    verifyAccessToken.mockReturnValue({ sub: userId, email: "alice@example.com" });

    AuthSession.create.mockResolvedValue({});
    AuthSession.updateOne.mockResolvedValue({ acknowledged: true });
  });

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

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token", 3600000);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: {
          id: userId,
          email: "alice@example.com",
          displayName: "Alice",
        },
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
        expect.objectContaining({
          userId,
          rememberMe: false,
        })
      );
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token", 3600000);

      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: {
          id: userId,
          email: "alice@example.com",
          displayName: "Alice",
        },
      });
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

    it("revokes and clears cookie when refresh session is expired", async () => {
      AuthSession.findOne.mockResolvedValue({
        _id: "session-id",
        expiresAt: new Date(Date.now() - 1000),
      });

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
      AuthSession.findOne.mockResolvedValue({
        _id: "session-id",
        userId,
        rememberMe: true,
        expiresAt: new Date(Date.now() + 10000),
      });
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
      AuthSession.findOne.mockResolvedValue({
        _id: "old-session",
        userId,
        rememberMe: false,
        expiresAt: new Date(Date.now() + 10000),
      });
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
        expect.objectContaining({
          userId,
          rememberMe: false,
          refreshTokenHash: "refresh-hash",
        })
      );

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token", 3600000);

      expect(res.json).toHaveBeenCalledWith({
        accessToken: "access-token",
        user: {
          id: userId,
          email: "alice@example.com",
          displayName: "Alice",
        },
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

  describe("me", () => {
    it("returns 401 when access token is missing", async () => {
      const req = mockReq();
      const res = mockRes();

      await me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Missing access token" });
    });

    it("returns 401 when token is valid but user is missing", async () => {
      verifyAccessToken.mockReturnValue({ sub: userId });
      User.findById.mockResolvedValue(null);

      const req = mockReq({ headers: { authorization: "Bearer access-token" } });
      const res = mockRes();

      await me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid access token" });
    });

    it("returns current user for valid token", async () => {
      verifyAccessToken.mockReturnValue({ sub: userId });
      User.findById.mockResolvedValue(makeUser());

      const req = mockReq({ headers: { authorization: "Bearer access-token" } });
      const res = mockRes();

      await me(req, res);

      expect(res.json).toHaveBeenCalledWith({
        user: {
          id: userId,
          email: "alice@example.com",
          displayName: "Alice",
        },
      });
    });

    it("returns 401 when token verification throws", async () => {
      verifyAccessToken.mockImplementation(() => {
        throw new Error("bad token");
      });

      const req = mockReq({ headers: { authorization: "Bearer bad-token" } });
      const res = mockRes();

      await me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired access token" });
    });
  });
});