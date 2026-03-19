import mongoose from "mongoose";
import Todo from "../models/todo.model.js";

const allowedTodoFields = new Set(["title", "description", "completed"]);

const pickAllowedTodoFields = (payload = {}) =>
  Object.fromEntries(
    Object.entries(payload).filter(([key]) => allowedTodoFields.has(key))
  );

const isInvalidObjectId = (id) => !mongoose.Types.ObjectId.isValid(id);

const sendError = (res, status, message) => {
  res.status(status).json({ message });
};

export const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ owner: req.auth.userId }).sort({ createdAt: -1 });
    res.json(todos);
  } catch {
    sendError(res, 500, "Error fetching todos");
  }
};

export const createTodo = async (req, res) => {
  try {
    const payload = pickAllowedTodoFields(req.body);
    const newTodo = await Todo.create({ ...payload, owner: req.auth.userId });
    res.status(201).json(newTodo);
  } catch {
    sendError(res, 400, "Error creating todo");
  }
};

export const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    if (isInvalidObjectId(id)) {
      return sendError(res, 400, "Invalid todo id");
    }

    const updates = pickAllowedTodoFields(req.body);
    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, "No valid fields provided for update");
    }

    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: id, owner: req.auth.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedTodo) {
      return sendError(res, 404, "Todo not found");
    }

    res.json(updatedTodo);
  } catch {
    sendError(res, 400, "Error updating todo");
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    if (isInvalidObjectId(id)) {
      return sendError(res, 400, "Invalid todo id");
    }

    const deletedTodo = await Todo.findOneAndDelete({ _id: id, owner: req.auth.userId });
    if (!deletedTodo) {
      return sendError(res, 404, "Todo not found");
    }

    res.json({ message: "Todo deleted successfully" });
  } catch {
    sendError(res, 400, "Error deleting todo");
  }
};
