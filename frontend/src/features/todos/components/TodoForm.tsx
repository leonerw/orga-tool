import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import { useState } from "react";

interface TodoFormValues {
  title: string;
  description: string;
}

interface Props {
  onAdd: (title: string, description?: string) => void;
}

export function TodoForm({ onAdd }: Props) {
  // --- State ---
  const form = useForm<TodoFormValues>({
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const [charCount, setCharCount] = useState(0);

  // --- Handlers ---

  const onSubmit = (data: TodoFormValues) => {
    if (!data.title.trim()) return;
    onAdd(data.title.trim(), data.description.trim());
    form.reset();
    setCharCount(0);
  };

  return (
    <Card className="w-full lg:w-[380px] flex flex-col transition-all hover:shadow-md">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-lg">New Todo</CardTitle>
        <CardDescription>Create a new task with a title and description.</CardDescription>
      </CardHeader>

      <CardContent>
        <form id="todo-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              rules={{ required: "Please enter a title" }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="todo-title">Title</FieldLabel>
                  <Input
                    {...field}
                    id="todo-title"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter title"
                  />
                  <FieldDescription>A short title for your todo.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="todo-description">Description</FieldLabel>

                  <InputGroup>
                    <InputGroupTextarea
                      {...field}
                      id="todo-description"
                      rows={4}
                      placeholder="Description (optional)"
                      className="resize-none"
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => {
                        field.onChange(e);
                        setCharCount(e.target.value.length);
                      }}
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText className="tabular-nums">
                        {charCount}/200
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>

                  <FieldDescription>
                    Optional: additional details or steps for the task.
                  </FieldDescription>

                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter>
        <Field orientation="horizontal" className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" form="todo-form">
            Add
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
