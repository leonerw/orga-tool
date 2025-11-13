import { useEffect, useState } from "react";
import { getTodos, createTodo, updateTodo, deleteTodoById } from "../api/todos";
import { type Todo } from "../types/todo";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTodos();
        setTodos(data);
      } catch {
        setError("Fehler beim Laden der Todos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addTodo(title: string, description?: string) {
    const newTodo = await createTodo({ title, description });
    setTodos((prev) => [newTodo, ...prev]);
  }

  async function toggleTodo(id: string) {
    const todo = todos.find((t) => t._id === id);
    if (!todo) return;
    const updated = await updateTodo(id, { completed: !todo.completed });
    setTodos((prev) =>
      prev.map((t) => (t._id === id ? updated : t))
    );
  }

  async function deleteTodo(id: string) {
    await deleteTodoById(id);
    setTodos((prev) => prev.filter((t) => t._id !== id));
  }

  return { todos, loading, error, addTodo, toggleTodo, deleteTodo };
}
