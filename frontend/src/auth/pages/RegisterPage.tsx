import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/context/useAuth";

export function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await register({ displayName, email, password, rememberMe });
            navigate("/");
        } catch {
            setError("Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto py-12">
            <h1 className="text-2xl font-semibold mb-6">Register</h1>
            <form onSubmit={handleRegister} className="space-y-4">
                <input
                    className="w-full border rounded px-3 py-2"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    required
                />
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
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>
            <p className="mt-4 text-sm">
                Already have an account? <Link to="/login" className="underline">Login</Link>
            </p>
        </div>
    );
}