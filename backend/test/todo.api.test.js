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

  it("creates a todo while ignoring unknown fields", async () => {
    const res = await request(app)
      .post("/api/todos")
      .send({ title: "A task", description: "desc", ignored: "x" })
      .expect(201);

    expect(res.body.title).toBe("A task");
    expect(res.body.description).toBe("desc");
    expect(res.body.ignored).toBeUndefined();
  });

  it("validates required fields on create", async () => {
    const res = await request(app)
      .post("/api/todos")
      .send({ title: "Missing description" })
      .expect(400);

    expect(res.body.message).toBe("Error creating todo");
    expect(res.body.error).toBeUndefined();
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

  it("updates an existing todo and ignores unknown update fields", async () => {
    const created = await request(app)
      .post("/api/todos")
      .send({ title: "Todo", description: "desc" });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .send({ completed: true, ignored: "x" })
      .expect(200);

    expect(created.body.completed).toBe(false);
    expect(res.body.completed).toBe(true);
    expect(res.body.ignored).toBeUndefined();
  });

  it("returns 400 when update id format is invalid", async () => {
    const res = await request(app)
      .put("/api/todos/not-a-valid-id")
      .send({ completed: true })
      .expect(400);

    expect(res.body.message).toBe("Invalid todo id");
  });

  it("returns 400 when no valid update fields are provided", async () => {
    const created = await request(app)
      .post("/api/todos")
      .send({ title: "Todo", description: "desc" });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .send({ ignored: true })
      .expect(400);

    expect(res.body.message).toBe("No valid fields provided for update");
  });

  it("returns 400 when update validation fails", async () => {
    const created = await request(app)
      .post("/api/todos")
      .send({ title: "Todo", description: "desc" });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .send({ title: "" })
      .expect(400);

    expect(res.body.message).toBe("Error updating todo");
    expect(res.body.error).toBeUndefined();
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

  it("returns 400 when delete id format is invalid", async () => {
    const res = await request(app)
      .delete("/api/todos/not-a-valid-id")
      .expect(400);

    expect(res.body.message).toBe("Invalid todo id");
  });

  it("returns 404 when deleting missing todo", async () => {
    const res = await request(app)
      .delete(`/api/todos/${new mongoose.Types.ObjectId()}`)
      .expect(404);

    expect(res.body.message).toBe("Todo not found");
  });
});
