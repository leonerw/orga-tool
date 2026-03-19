import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { TOTP, Secret } from "otpauth";
import { createApp } from "../src/app.js";
import { signEmailVerifyToken } from "../src/utils/auth.js";

// Prevent real email sending during integration tests
vi.mock("../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Auth API integration", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    const db = mongoose.connection.db;
    if (db) {
      await db.dropDatabase();
    }
  });

  // ─── existing tests ──────────────────────────────────────────────────────────

  it("registers user and returns access token + refresh cookie", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.user.displayName).toBe("Alice");
    expect(res.body.user.emailVerified).toBe(false);
    expect(res.body.user.twoFactorEnabled).toBe(false);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("refreshToken=");
  });

  it("rejects duplicate register", async () => {
    const payload = {
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    };

    await request(app).post("/api/auth/register").send(payload).expect(201);
    await request(app).post("/api/auth/register").send(payload).expect(409);
  });

  it("rejects login with wrong password", async () => {
    await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "WrongPassword",
      rememberMe: true,
    }).expect(401);
  });

  it("logs in and returns access token", async () => {
    await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    const res = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "Password123",
      rememberMe: true,
    }).expect(200);

    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body.user.email).toBe("alice@example.com");
  });

  it("returns current user via /me with bearer token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerRes.body.accessToken}`)
      .expect(200);

    expect(meRes.body.user.email).toBe("alice@example.com");
    expect(meRes.body.user.emailVerified).toBe(false);
  });

  it("refreshes session using refresh cookie", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    const refreshRes = await agent.post("/api/auth/refresh").expect(200);
    expect(typeof refreshRes.body.accessToken).toBe("string");
    expect(refreshRes.body.user.email).toBe("alice@example.com");
  });

  it("revokes session on logout and blocks refresh afterwards", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    await agent.post("/api/auth/logout").expect(204);
    await agent.post("/api/auth/refresh").expect(401);
  });

  // ─── reuse detection ─────────────────────────────────────────────────────────

  it("revokes all sessions when a revoked refresh token is reused", async () => {
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);

    // Register and capture the initial refresh cookie
    const registerRes = await agent1.post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    // Copy the initial cookie to agent2 before agent1 rotates it
    const initialCookie = registerRes.headers["set-cookie"];
    agent2.jar.setCookies(initialCookie);

    // agent1 performs a legitimate refresh — old token is now revoked
    await agent1.post("/api/auth/refresh").expect(200);

    // agent2 tries to use the (now revoked) token — should trigger reuse detection
    await agent2.post("/api/auth/refresh").expect(401);

    // agent1's new session should also be revoked now
    await agent1.post("/api/auth/refresh").expect(401);
  });

  // ─── changePassword ──────────────────────────────────────────────────────────

  it("changes password and rejects old password afterwards", async () => {
    const agent = request.agent(app);

    const registerRes = await agent.post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    const token = registerRes.body.accessToken;

    await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "Password123", newPassword: "NewPassword456" })
      .expect(204);

    await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "Password123",
      rememberMe: false,
    }).expect(401);

    await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "NewPassword456",
      rememberMe: false,
    }).expect(200);
  });

  it("returns 401 when changing password with wrong current password", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    await request(app)
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${registerRes.body.accessToken}`)
      .send({ currentPassword: "WrongPassword", newPassword: "NewPassword456" })
      .expect(401);
  });

  // ─── email verification ───────────────────────────────────────────────────────

  it("verifies email with a valid token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: true,
    }).expect(201);

    // Sign a verification token using the known test secret
    const verifyToken = signEmailVerifyToken(registerRes.body.user.id);

    await request(app)
      .get(`/api/auth/verify-email?token=${verifyToken}`)
      .expect(200);

    // Confirm emailVerified is now true via /me
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${registerRes.body.accessToken}`)
      .expect(200);

    expect(meRes.body.user.emailVerified).toBe(true);
  });

  it("returns 400 for invalid email verification token", async () => {
    await request(app)
      .get("/api/auth/verify-email?token=totallyinvalidtoken")
      .expect(400);
  });

  // ─── 2FA full flow ────────────────────────────────────────────────────────────

  it("completes full 2FA setup and login flow", async () => {
    // 1. Register
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: false,
    }).expect(201);

    const accessToken = registerRes.body.accessToken;

    // 2. Setup 2FA — returns secret + QR code
    const setupRes = await request(app)
      .post("/api/auth/2fa/setup")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(typeof setupRes.body.secret).toBe("string");
    expect(typeof setupRes.body.qrCodeDataUrl).toBe("string");

    // 3. Confirm 2FA with a valid code generated from the returned secret
    const totp = new TOTP({ secret: Secret.fromBase32(setupRes.body.secret), digits: 6, period: 30, algorithm: "SHA1" });
    const confirmRes = await request(app)
      .post("/api/auth/2fa/confirm")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ code: totp.generate() })
      .expect(200);

    expect(confirmRes.body.backupCodes).toHaveLength(10);

    // 4. Login now returns otp_required instead of tokens
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "Password123",
      rememberMe: false,
    }).expect(200);

    expect(loginRes.body.step).toBe("otp_required");
    expect(typeof loginRes.body.pendingToken).toBe("string");

    // 5. Complete login with a fresh TOTP code
    const twoFaRes = await request(app).post("/api/auth/2fa/login").send({
      pendingToken: loginRes.body.pendingToken,
      code: totp.generate(),
    }).expect(200);

    expect(typeof twoFaRes.body.accessToken).toBe("string");
    expect(twoFaRes.body.user.twoFactorEnabled).toBe(true);
  });

  it("rejects 2FA login with invalid TOTP code", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "Password123",
      displayName: "Alice",
      rememberMe: false,
    }).expect(201);

    const accessToken = registerRes.body.accessToken;

    const setupRes = await request(app)
      .post("/api/auth/2fa/setup")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const totp = new TOTP({ secret: Secret.fromBase32(setupRes.body.secret), digits: 6, period: 30, algorithm: "SHA1" });
    await request(app)
      .post("/api/auth/2fa/confirm")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ code: totp.generate() })
      .expect(200);

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "Password123",
      rememberMe: false,
    }).expect(200);

    await request(app).post("/api/auth/2fa/login").send({
      pendingToken: loginRes.body.pendingToken,
      code: "000000",
    }).expect(401);
  });
});
