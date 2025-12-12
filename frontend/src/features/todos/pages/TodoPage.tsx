// src/features/todos/pages/TodoPage.tsx
import { TodoForm } from "../components/TodoForm";
import { TodoList } from "../components/TodoList";
import { useTodos } from "../hooks/useTodos";

export function TodoPage() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();

  return (
    <div className="flex flex-col py-8">

      {/* Desktop: Liste links, Form rechts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
        
        {/* LISTE LINKS */}
        <TodoList 
              todos={todos}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />

        {/* FORM RECHTS */}
        <TodoForm onAdd={addTodo} />

      </div>
    </div>
  );
}
