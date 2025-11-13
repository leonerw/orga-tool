import { type Todo } from "../types/todo";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  todos: Todo[];
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TodoList({ todos, onToggle, onDelete }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  // Empty state
  if (todos.length === 0) {
    return (
      <Card className="w-full flex flex-col transition-all hover:shadow-md">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-lg">Keine Todos</CardTitle>
          <CardDescription>
            Füge rechts ein neues Todo hinzu.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full flex flex-col transition-all hover:shadow-md">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-lg">Deine Todos</CardTitle>
        <CardDescription>
          Übersicht deiner offenen und erledigten Aufgaben
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo._id}
              className={cn(
                "flex items-start justify-between rounded-md border p-3",
                "transition-all bg-background",
                todo.completed && "opacity-60"
              )}
            >
              <div className="flex gap-3 flex-1">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => onToggle?.(todo._id)}
                />

                <div>
                  <p
                    className={cn(
                      "font-medium",
                      todo.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {todo.title}
                  </p>

                  {todo.description && (
                    <p className="text-sm text-muted-foreground">
                      {todo.description}
                    </p>
                  )}
                </div>
              </div>

              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setDeleting(todo._id);
                    await new Promise((r) => setTimeout(r, 200));
                    onDelete(todo._id);
                    setDeleting(null);
                  }}
                  disabled={deleting === todo._id}
                >
                  {deleting === todo._id ? "…" : "✕"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
