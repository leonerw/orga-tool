import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTodos, createTodo, updateTodo, deleteTodo } from "../src/controllers/todo.controller.js";
import Todo from "../src/models/todo.model.js";

vi.mock("../src/models/todo.model.js", () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

const mockRes = () => {
  const res = {};
  // Express response methods are chainable (res.status(...).json(...)).
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("todo.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns todos sorted newest first", async () => {
    const res = mockRes();
    const todos = [{ id: "2" }, { id: "1" }];
    // Todo.find() returns a query object whose sort() resolves to documents.
    const sort = vi.fn().mockResolvedValue(todos);
    Todo.find.mockReturnValue({ sort });

    await getTodos({}, res);

    expect(Todo.find).toHaveBeenCalledTimes(1);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.json).toHaveBeenCalledWith(todos);
  });

  it("handles getTodos failures", async () => {
    const res = mockRes();
    const error = new Error("db down");
    const sort = vi.fn().mockRejectedValue(error);
    Todo.find.mockReturnValue({ sort });

    await getTodos({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Error fetching todos", error });
  });

  it("creates a todo and returns 201", async () => {
    const res = mockRes();
    const req = { body: { title: "title", description: "desc" } };
    const created = { id: "123", ...req.body, completed: false };
    Todo.create.mockResolvedValue(created);

    await createTodo(req, res);

    expect(Todo.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it("handles create errors", async () => {
    const res = mockRes();
    const req = { body: {} };
    const error = new Error("validation");
    Todo.create.mockRejectedValue(error);

    await createTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Error creating todo", error });
  });

  it("updates an existing todo", async () => {
    const res = mockRes();
    const req = { params: { id: "123" }, body: { completed: true } };
    const updated = { id: req.params.id, completed: true };
    Todo.findByIdAndUpdate.mockResolvedValue(updated);

    await updateTodo(req, res);

    expect(Todo.findByIdAndUpdate).toHaveBeenCalledWith(req.params.id, req.body, { new: true });
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it("returns 404 when updating a missing todo", async () => {
    const res = mockRes();
    const req = { params: { id: "missing" }, body: { completed: true } };
    Todo.findByIdAndUpdate.mockResolvedValue(null);

    await updateTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Todo not found" });
  });

  it("handles update errors", async () => {
    const res = mockRes();
    const req = { params: { id: "123" }, body: { completed: true } };
    const error = new Error("update failed");
    Todo.findByIdAndUpdate.mockRejectedValue(error);

    await updateTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Error updating todo", error });
  });

  it("deletes an existing todo", async () => {
    const res = mockRes();
    const req = { params: { id: "123" } };
    Todo.findByIdAndDelete.mockResolvedValue({ id: req.params.id });

    await deleteTodo(req, res);

    expect(Todo.findByIdAndDelete).toHaveBeenCalledWith(req.params.id);
    expect(res.json).toHaveBeenCalledWith({ message: "Todo deleted successfully" });
  });

  it("returns 404 when deleting a missing todo", async () => {
    const res = mockRes();
    const req = { params: { id: "missing" } };
    Todo.findByIdAndDelete.mockResolvedValue(null);

    await deleteTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Todo not found" });
  });

  it("handles delete errors", async () => {
    const res = mockRes();
    const req = { params: { id: "123" } };
    const error = new Error("delete failed");
    Todo.findByIdAndDelete.mockRejectedValue(error);

    await deleteTodo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Error deleting todo", error });
  });
});
