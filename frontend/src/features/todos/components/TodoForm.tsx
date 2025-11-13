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
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group"; // falls vorhanden
import { InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import { useState } from "react";

interface TodoFormValues {
  title: string;
  description: string;
}

interface Props {
  onAdd: (title: string, description?: string) => void;
}

export function TodoForm({ onAdd }: Props) {
  const form = useForm<TodoFormValues>({
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const [charCount, setCharCount] = useState(0);

  const onSubmit = (data: TodoFormValues) => {
    if (!data.title.trim()) return;
    onAdd(data.title.trim(), data.description.trim());
    form.reset();
    setCharCount(0);
  };

  return (
    <Card className="w-full lg:w-[380px] flex flex-col transition-all hover:shadow-md">
      <CardHeader className="space-y-0 pb-2">
        <CardTitle className="text-lg">Neues Todo</CardTitle>
        <CardDescription>Erstelle eine neue Aufgabe mit Titel und Beschreibung.</CardDescription>
      </CardHeader>

      <CardContent>
        <form id="todo-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {/* Titel */}
            <Controller
              name="title"
              control={form.control}
              rules={{ required: "Bitte einen Titel eingeben" }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="todo-title">Titel</FieldLabel>
                  <Input
                    {...field}
                    id="todo-title"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    placeholder="Titel eingeben"
                  />
                  <FieldDescription>Kurzer, prägnanter Titel für dein Todo.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Beschreibung */}
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="todo-description">Beschreibung</FieldLabel>

                  <InputGroup>
                    <InputGroupTextarea
                      {...field}
                      id="todo-description"
                      rows={4}
                      placeholder="Beschreibung (optional)"
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
                    Optional: Weitere Details oder Schritte zur Aufgabe.
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
            Zurücksetzen
          </Button>
          <Button type="submit" form="todo-form">
            Hinzufügen
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
