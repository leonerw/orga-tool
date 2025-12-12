import api from "@/services/api";
import { type Todo } from "../types/todo";

export async function getTodos(): Promise<Todo[]> {
  const res = await api.get("/todos");
  return res.data;
}

export async function createTodo(data: { title: string; description?: string }): Promise<Todo> {
  const res = await api.post("/todos", data);
  return res.data;
}

export async function updateTodo(id: string, data: Partial<Todo>): Promise<Todo> {
  const res = await api.put(`/todos/${id}`, data);
  return res.data;
}

export async function deleteTodoById(id: string): Promise<void> {
  await api.delete(`/todos/${id}`);
}
