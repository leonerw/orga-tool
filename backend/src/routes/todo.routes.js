import express from "express";
import Todo from "../models/todo.model.js";
import { createTodo, deleteTodo, getTodos, updateTodo } from "../controllers/todo.controller.js";
const router = express.Router();

router.get("/", getTodos);
router.post("/", createTodo);
router.put("/:id", updateTodo);
router.delete("/:id", deleteTodo);

export default router;