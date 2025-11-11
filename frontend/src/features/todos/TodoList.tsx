import { useEffect, useState } from "react";
import api from "../../services/api";

interface Todo {
  _id: string;
  title: string;
  completed: boolean;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    api.get("/todos").then(res => setTodos(res.data));
  }, []);

  const addTodo = async () => {
    const res = await api.post("/todos", { title: newTitle });
    setTodos([...todos, res.data]);
    setNewTitle("");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-2 font-bold">Todo Liste</h2>
      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Neues Todo" />
      <button onClick={addTodo}>Hinzufügen</button>
      <ul>
        {todos.map(todo => (
          <li key={todo._id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}