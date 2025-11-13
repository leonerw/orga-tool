import { useTodos } from "../hooks/useTodos";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WidgetLayout } from "@/components/layout/WidgetLayout";
import MaxIcon from "@/assets/icons/maximize.svg?react"; 

export function TodoWidget() {
  const { todos, loading } = useTodos();
  const navigate = useNavigate();

  const openTodos = todos.filter((t) => !t.completed);

  return (
    <WidgetLayout
      title="Todos"
      description="Deine offenen Aufgaben"
      loading={loading}
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/todos")}
        >
          <MaxIcon className="w-5 h-5 text-gray-500"/>
        </Button>
      }
    >
      <p className="text-base">
        {openTodos.length > 0
          ? `${openTodos.length} offene ${openTodos.length === 1 ? "Aufgabe" : "Aufgaben"}`
          : "Alle Aufgaben erledigt 🎉"}
      </p>
    </WidgetLayout>
  );
}
