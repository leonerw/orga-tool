import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";

describe("Todo API integration", () => {
  let mongoServer;
  let app;
  let emailCounter = 0;

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
    emailCounter = 0;
  });

  async function registerAndGetToken(label = "user") {
    emailCounter += 1;
    const email = `${label}${emailCounter}@example.com`;

    const res = await request(app).post("/api/auth/register").send({
      email,
      password: "Password123",
      displayName: `${label}${emailCounter}`,
      rememberMe: true,
    }).expect(201);

    return res.body.accessToken;
  }

  function auth(token) {
    return { Authorization: `Bearer ${token}` };
  }

  it("requires auth for todo endpoints", async () => {
    await request(app).get("/api/todos").expect(401);
  });

  it("creates a todo through the controller route", async () => {
    const token = await registerAndGetToken();

    const payload = { title: "A task", description: "do things" };
    const res = await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send(payload)
      .expect(201);

    expect(res.body.title).toBe(payload.title);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.completed).toBe(false);
    expect(res.body._id).toBeDefined();
    expect(res.body.owner).toBeDefined();
  });

  it("creates a todo while ignoring unknown fields", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "A task", description: "desc", ignored: "x" })
      .expect(201);

    expect(res.body.title).toBe("A task");
    expect(res.body.description).toBe("desc");
    expect(res.body.ignored).toBeUndefined();
  });

  it("validates required fields on create", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "Missing description" })
      .expect(400);

    expect(res.body.message).toBe("Error creating todo");
    expect(res.body.error).toBeUndefined();
  });

  it("lists todos sorted by newest first", async () => {
    const token = await registerAndGetToken();

    await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "First", description: "first desc" });

    await new Promise((resolve) => setTimeout(resolve, 5));

    await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "Second", description: "second desc" });

    const res = await request(app)
      .get("/api/todos")
      .set(auth(token))
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe("Second");
    expect(res.body[1].title).toBe("First");
  });

  it("updates an existing todo and ignores unknown update fields", async () => {
    const token = await registerAndGetToken();

    const created = await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "Todo", description: "desc" });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(auth(token))
      .send({ completed: true, ignored: "x" })
      .expect(200);

    expect(created.body.completed).toBe(false);
    expect(res.body.completed).toBe(true);
    expect(res.body.ignored).toBeUndefined();
  });

  it("returns 400 when update id format is invalid", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .put("/api/todos/not-a-valid-id")
      .set(auth(token))
      .send({ completed: true })
      .expect(400);

    expect(res.body.message).toBe("Invalid todo id");
  });

  it("returns 400 when no valid update fields are provided", async () => {
    const token = await registerAndGetToken();

    const created = await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "Todo", description: "desc" });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(auth(token))
      .send({ ignored: true })
      .expect(400);

    expect(res.body.message).toBe("No valid fields provided for update");
  });

  it("returns 400 when update validation fails", async () => {
    const token = await registerAndGetToken();

    const created = await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "Todo", description: "desc" });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(auth(token))
      .send({ title: "" })
      .expect(400);

    expect(res.body.message).toBe("Error updating todo");
    expect(res.body.error).toBeUndefined();
  });

  it("returns 404 when updating missing todo", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .put(`/api/todos/${new mongoose.Types.ObjectId()}`)
      .set(auth(token))
      .send({ completed: true })
      .expect(404);

    expect(res.body.message).toBe("Todo not found");
  });

  it("deletes an existing todo", async () => {
    const token = await registerAndGetToken();

    const created = await request(app)
      .post("/api/todos")
      .set(auth(token))
      .send({ title: "Todo", description: "desc" });

    await request(app)
      .delete(`/api/todos/${created.body._id}`)
      .set(auth(token))
      .expect(200);

    const list = await request(app)
      .get("/api/todos")
      .set(auth(token))
      .expect(200);

    expect(list.body).toHaveLength(0);
  });

  it("returns 400 when delete id format is invalid", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .delete("/api/todos/not-a-valid-id")
      .set(auth(token))
      .expect(400);

    expect(res.body.message).toBe("Invalid todo id");
  });

  it("returns 404 when deleting missing todo", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .delete(`/api/todos/${new mongoose.Types.ObjectId()}`)
      .set(auth(token))
      .expect(404);

    expect(res.body.message).toBe("Todo not found");
  });

  it("enforces ownership isolation between users", async () => {
    const tokenA = await registerAndGetToken("userA");
    const tokenB = await registerAndGetToken("userB");

    const createdByA = await request(app)
      .post("/api/todos")
      .set(auth(tokenA))
      .send({ title: "A todo", description: "owned by A" })
      .expect(201);

    const listB = await request(app)
      .get("/api/todos")
      .set(auth(tokenB))
      .expect(200);

    expect(listB.body).toHaveLength(0);

    await request(app)
      .put(`/api/todos/${createdByA.body._id}`)
      .set(auth(tokenB))
      .send({ completed: true })
      .expect(404);

    await request(app)
      .delete(`/api/todos/${createdByA.body._id}`)
      .set(auth(tokenB))
      .expect(404);
  });
});
