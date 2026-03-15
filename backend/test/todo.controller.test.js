import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTodo, deleteTodo, getTodos, updateTodo } from "../src/controllers/todo.controller.js";
import Todo from "../src/models/todo.model.js";

vi.mock("../src/models/todo.model.js", () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

const validId = "507f191e810c19729de860ea";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  auth: { userId: validId, email: "user@test.com" },
  params: {},
  body: {},
  ...overrides,
});

describe("todo.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only current user's todos sorted newest first", async () => {
    const res = mockRes();
    const todos = [{ id: "2" }, { id: "1" }];
    const sort = vi.fn().mockResolvedValue(todos);
    Todo.find.mockReturnValue({ sort });

    await getTodos(mockReq(), res);

    expect(Todo.find).toHaveBeenCalledWith({ owner: validId });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.json).toHaveBeenCalledWith(todos);
  });

  it("handles getTodos failures", async () => {
    const res = mockRes();
    const sort = vi.fn().mockRejectedValue(new Error("db down"));
    Todo.find.mockReturnValue({ sort });

    await getTodos(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Error fetching todos" });
  });

  it("creates a todo with allowed fields plus owner", async () => {
    const res = mockRes();
    const req = mockReq({
      body: {
        title: "title",
        description: "desc",
        completed: false,
        ignored: "x",
      },
    });
    const created = { _id: validId, title: "title", description: "desc", completed: false, owner: validId };
    Todo.create.mockResolvedValue(created);

    await createTodo(req, res);

    expect(Todo.create).toHaveBeenCalledWith({
      title: "title",
      description: "desc",
      completed: false,
      owner: validId,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it("handles create errors without exposing internals", async () => {
    const res = mockRes();
    Todo.create.mockRejectedValue(new Error("validation"));

    await createTodo(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Error creating todo" });
  });

  it("updates an existing todo with owner filter", async () => {
    const res = mockRes();
    const req = mockReq({
      params: { id: validId },
      body: { completed: true, ignored: "x" },
    });
    const updated = { _id: validId, completed: true };
    Todo.findOneAndUpdate.mockResolvedValue(updated);

    await updateTodo(req, res);

    expect(Todo.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: validId, owner: validId },
      { completed: true },
      { new: true, runValidators: true }
    );
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it("returns 400 for invalid update id", async () => {
    const res = mockRes();
    const req = mockReq({
      params: { id: "invalid-id" },
      body: { completed: true },
    });

    await updateTodo(req, res);

    expect(Todo.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid todo id" });
  });

  it("returns 400 when no valid update fields are provided", async () => {
    const res = mockRes();
    const req = mockReq({
      params: { id: validId },
      body: { ignored: true },
    });

    await updateTodo(req, res);

    expect(Todo.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "No valid fields provided for update" });
  });

  it("returns 404 when updating a missing todo", async () => {
    const res = mockRes();
    const req = mockReq({
      params: { id: validId },
      body: { completed: true },
    });
    Todo.findOneAndUpdate.mockResolvedValue(null);

    await updateTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Todo not found" });
  });

  it("handles update errors without exposing internals", async () => {
    const res = mockRes();
    const req = mockReq({
      params: { id: validId },
      body: { completed: true },
    });
    Todo.findOneAndUpdate.mockRejectedValue(new Error("update failed"));

    await updateTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Error updating todo" });
  });

  it("deletes an existing todo with owner filter", async () => {
    const res = mockRes();
    const req = mockReq({ params: { id: validId } });
    Todo.findOneAndDelete.mockResolvedValue({ _id: validId });

    await deleteTodo(req, res);

    expect(Todo.findOneAndDelete).toHaveBeenCalledWith({ _id: validId, owner: validId });
    expect(res.json).toHaveBeenCalledWith({ message: "Todo deleted successfully" });
  });

  it("returns 400 for invalid delete id", async () => {
    const res = mockRes();
    const req = mockReq({ params: { id: "invalid-id" } });

    await deleteTodo(req, res);

    expect(Todo.findOneAndDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid todo id" });
  });

  it("returns 404 when deleting a missing todo", async () => {
    const res = mockRes();
    const req = mockReq({ params: { id: validId } });
    Todo.findOneAndDelete.mockResolvedValue(null);

    await deleteTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Todo not found" });
  });

  it("handles delete errors without exposing internals", async () => {
    const res = mockRes();
    const req = mockReq({ params: { id: validId } });
    Todo.findOneAndDelete.mockRejectedValue(new Error("delete failed"));

    await deleteTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Error deleting todo" });
  });
});
