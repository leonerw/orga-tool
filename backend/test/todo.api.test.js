import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";

describe("Todo API integration", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    // Use an ephemeral MongoDB instance so integration tests do not depend on external services.
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
      // Isolate tests so each case starts with a clean database state.
      await db.dropDatabase();
    }
  });

  it("creates a todo through the controller route", async () => {
    const payload = { title: "A task", description: "do things" };

    const res = await request(app).post("/api/todos").send(payload).expect(201);

    expect(res.body.title).toBe(payload.title);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.completed).toBe(false);
    expect(res.body._id).toBeDefined();
  });

  it("validates required fields on create", async () => {
    const res = await request(app)
      .post("/api/todos")
      .send({ title: "Missing description" })
      .expect(400);

    expect(res.body.message).toBe("Error creating todo");
  });

  it("lists todos sorted by newest first", async () => {
    await request(app)
      .post("/api/todos")
      .send({ title: "First", description: "first desc" });
    // Ensure distinct timestamps so sorting by createdAt is deterministic.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await request(app)
      .post("/api/todos")
      .send({ title: "Second", description: "second desc" });

    const res = await request(app).get("/api/todos").expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe("Second");
    expect(res.body[1].title).toBe("First");
  });

  it("updates an existing todo", async () => {
    const created = await request(app)
      .post("/api/todos")
      .send({ title: "Todo", description: "desc" });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .send({ completed: true })
      .expect(200);

    expect(created.body.completed).toBe(false);
    expect(res.body.completed).toBe(true);
  });

  it("returns 404 when updating missing todo", async () => {
    const res = await request(app)
      .put(`/api/todos/${new mongoose.Types.ObjectId()}`)
      .send({ completed: true })
      .expect(404);

    expect(res.body.message).toBe("Todo not found");
  });

  it("deletes an existing todo", async () => {
    const created = await request(app)
      .post("/api/todos")
      .send({ title: "Todo", description: "desc" });

    await request(app).delete(`/api/todos/${created.body._id}`).expect(200);

    const list = await request(app).get("/api/todos").expect(200);
    expect(list.body).toHaveLength(0);
  });

  it("returns 404 when deleting missing todo", async () => {
    const res = await request(app)
      .delete(`/api/todos/${new mongoose.Types.ObjectId()}`)
      .expect(404);

    expect(res.body.message).toBe("Todo not found");
  });
});
