import { useTodos } from "../hooks/useTodos";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WidgetLayout } from "@/components/layout/WidgetLayout";

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
          Öffnen
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
