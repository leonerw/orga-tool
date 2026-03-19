import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/context/useAuth";

type LoginStep = "credentials" | "otp" | "backup";

export function LoginPage() {
    const navigate = useNavigate();
    const { login, verifyOtp, recoverWithBackupCode } = useAuth();

    const [step, setStep] = useState<LoginStep>("credentials");
    const [pendingToken, setPendingToken] = useState("");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [code, setCode] = useState("");
    const [backupCode, setBackupCode] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = await login({ email, password, rememberMe });
            if (result?.step === "otp_required") {
                setPendingToken(result.pendingToken);
                setStep("otp");
            } else {
                navigate("/");
            }
        } catch {
            setError("Invalid email or password");
        } finally {
            setLoading(false);
        }
    }

    async function handleOtp(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await verifyOtp(pendingToken, code);
            navigate("/");
        } catch {
            setError("Invalid code");
        } finally {
            setLoading(false);
        }
    }

    async function handleBackupCode(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await recoverWithBackupCode(pendingToken, backupCode);
            navigate("/");
        } catch {
            setError("Invalid backup code");
        } finally {
            setLoading(false);
        }
    }

    if (step === "otp") {
        return (
            <div className="max-w-md mx-auto py-12">
                <h1 className="text-2xl font-semibold mb-2">Two-factor authentication</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Enter the 6-digit code from your authenticator app.
                </p>
                <form onSubmit={handleOtp} className="space-y-4">
                    <input
                        className="w-full border rounded px-3 py-2 tracking-widest text-center text-lg"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        required
                    />
                    {error ? <p className="text-red-500 text-sm">{error}</p> : null}
                    <button className="w-full border rounded px-3 py-2" type="submit" disabled={loading}>
                        {loading ? "Verifying..." : "Verify"}
                    </button>
                </form>
                <p className="mt-4 text-sm">
                    Lost your authenticator?{" "}
                    <button className="underline" onClick={() => { setError(null); setStep("backup"); }}>
                        Use a backup code
                    </button>
                </p>
            </div>
        );
    }

    if (step === "backup") {
        return (
            <div className="max-w-md mx-auto py-12">
                <h1 className="text-2xl font-semibold mb-2">Backup code recovery</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Enter one of your saved backup codes to access your account.
                </p>
                <form onSubmit={handleBackupCode} className="space-y-4">
                    <input
                        className="w-full border rounded px-3 py-2 font-mono"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value)}
                        placeholder="xxxxxxxx"
                        autoFocus
                        required
                    />
                    {error ? <p className="text-red-500 text-sm">{error}</p> : null}
                    <button className="w-full border rounded px-3 py-2" type="submit" disabled={loading}>
                        {loading ? "Verifying..." : "Recover access"}
                    </button>
                </form>
                <p className="mt-4 text-sm">
                    <button className="underline" onClick={() => { setError(null); setStep("otp"); }}>
                        Back to authenticator code
                    </button>
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto py-12">
            <h1 className="text-2xl font-semibold mb-6">Login</h1>
            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    className="w-full border rounded px-3 py-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    required
                />
                <input
                    className="w-full border rounded px-3 py-2"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                />
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Stay logged in
                </label>
                {error ? <p className="text-red-500 text-sm">{error}</p> : null}
                <button
                    className="w-full border rounded px-3 py-2"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
            <p className="mt-4 text-sm">
                No account? <Link to="/register" className="underline">Register</Link>
            </p>
        </div>
    );
}
