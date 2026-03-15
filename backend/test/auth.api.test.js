import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";

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
});