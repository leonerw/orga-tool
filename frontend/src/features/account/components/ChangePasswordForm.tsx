import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { changePassword } from "@/auth/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface FormValues {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function ChangePasswordForm() {
    const [success, setSuccess] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    async function onSubmit(data: FormValues) {
        setServerError(null);
        setSuccess(false);

        if (data.newPassword !== data.confirmPassword) {
            form.setError("confirmPassword", { message: "Passwords do not match" });
            return;
        }

        try {
            await changePassword(data.currentPassword, data.newPassword);
            setSuccess(true);
            form.reset();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                "Failed to change password";
            setServerError(msg);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>
                    All other active sessions will be logged out when you save.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form id="change-password-form" onSubmit={form.handleSubmit(onSubmit)}>
                    <FieldGroup>
                        <Controller
                            name="currentPassword"
                            control={form.control}
                            rules={{ required: "Current password is required" }}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                                    <Input {...field} id="current-password" type="password" autoComplete="current-password" />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="newPassword"
                            control={form.control}
                            rules={{
                                required: "New password is required",
                                minLength: { value: 8, message: "Must be at least 8 characters" },
                            }}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                                    <Input {...field} id="new-password" type="password" autoComplete="new-password" />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="confirmPassword"
                            control={form.control}
                            rules={{ required: "Please confirm your new password" }}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                                    <Input {...field} id="confirm-password" type="password" autoComplete="new-password" />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    {serverError && <p className="mt-3 text-sm text-red-500">{serverError}</p>}
                    {success && <p className="mt-3 text-sm text-green-600">Password changed successfully.</p>}
                </form>
            </CardContent>

            <CardFooter className="justify-end">
                <Button type="submit" form="change-password-form" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save"}
                </Button>
            </CardFooter>
        </Card>
    );
}
