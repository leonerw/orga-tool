import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/context/useAuth";

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login({ email, password, rememberMe });
            navigate("/");
        } catch {
            setError("Login failed");
        } finally {
            setLoading(false);
        }
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