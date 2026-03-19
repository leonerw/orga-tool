import { useState } from "react";
import { confirmTwoFactor, disableTwoFactor, setupTwoFactor } from "@/auth/api/auth";
import { useAuth } from "@/auth/context/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type SetupStep = "idle" | "scan" | "confirm" | "backup" | "disable";

export function TwoFactorSetup() {
    const { user, refreshUser } = useAuth();
    const [setupStep, setSetupStep] = useState<SetupStep>("idle");
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
    const [secret, setSecret] = useState("");
    const [code, setCode] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isEnabled = user?.twoFactorEnabled ?? false;

    async function handleStartSetup() {
        setError(null);
        setLoading(true);
        try {
            const data = await setupTwoFactor();
            setQrCodeDataUrl(data.qrCodeDataUrl);
            setSecret(data.secret);
            setSetupStep("scan");
        } catch {
            setError("Failed to start 2FA setup. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirm(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await confirmTwoFactor(code);
            setBackupCodes(data.backupCodes);
            await refreshUser();
            setSetupStep("backup");
        } catch {
            setError("Invalid code. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDisable(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await disableTwoFactor(disableCode);
            await refreshUser();
            setSetupStep("idle");
            setDisableCode("");
        } catch {
            setError("Invalid code.");
        } finally {
            setLoading(false);
        }
    }

    // --- Disable flow ---
    if (setupStep === "disable") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Disable two-factor authentication</CardTitle>
                    <CardDescription>Enter your authenticator code to confirm.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="disable-2fa-form" onSubmit={handleDisable}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="disable-code">Authenticator code</FieldLabel>
                                <Input
                                    id="disable-code"
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value)}
                                    inputMode="numeric"
                                    maxLength={6}
                                    autoFocus
                                />
                            </Field>
                        </FieldGroup>
                        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
                    </form>
                </CardContent>
                <CardFooter className="gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setSetupStep("idle"); setError(null); }}>
                        Cancel
                    </Button>
                    <Button variant="destructive" type="submit" form="disable-2fa-form" disabled={loading}>
                        {loading ? "Disabling..." : "Disable 2FA"}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // --- Backup codes display (shown once after confirming setup) ---
    if (setupStep === "backup") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Save your backup codes</CardTitle>
                    <CardDescription>
                        Store these somewhere safe. Each code can only be used once. They will not be shown again.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((c) => (
                            <code key={c} className="bg-muted px-3 py-1 rounded text-sm font-mono text-center">
                                {c}
                            </code>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={() => setSetupStep("idle")}>Done</Button>
                </CardFooter>
            </Card>
        );
    }

    // --- Scan QR code step ---
    if (setupStep === "scan") {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Set up two-factor authentication</CardTitle>
                    <CardDescription>
                        Scan the QR code with Google Authenticator or any TOTP app, then enter the code below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-center">
                        <img src={qrCodeDataUrl} alt="2FA QR code" className="w-48 h-48" />
                    </div>
                    <details className="text-sm text-muted-foreground">
                        <summary className="cursor-pointer">Can't scan? Enter manually</summary>
                        <code className="block mt-2 break-all bg-muted px-3 py-2 rounded font-mono text-xs">
                            {secret}
                        </code>
                    </details>
                    <form id="confirm-2fa-form" onSubmit={handleConfirm}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="totp-code">Code from app</FieldLabel>
                                <Input
                                    id="totp-code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    autoFocus
                                />
                                {error && <FieldError errors={[{ message: error }]} />}
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter className="gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setSetupStep("idle"); setError(null); }}>
                        Cancel
                    </Button>
                    <Button type="submit" form="confirm-2fa-form" disabled={loading}>
                        {loading ? "Verifying..." : "Activate"}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // --- Default: 2FA status card ---
    return (
        <Card>
            <CardHeader>
                <CardTitle>Two-factor authentication</CardTitle>
                <CardDescription>
                    {isEnabled
                        ? "2FA is enabled. Your account is protected by an authenticator app."
                        : "Add an extra layer of security to your account."}
                </CardDescription>
            </CardHeader>
            <CardFooter>
                {isEnabled ? (
                    <Button variant="destructive" onClick={() => setSetupStep("disable")}>
                        Disable 2FA
                    </Button>
                ) : (
                    <Button onClick={handleStartSetup} disabled={loading}>
                        {loading ? "Loading..." : "Enable 2FA"}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
