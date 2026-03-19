import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/auth/api/auth";
import { useAuth } from "@/auth/context/useAuth";

type Status = "pending" | "success" | "error";

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState<Status>("pending");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("error");
            return;
        }

        verifyEmail(token)
            .then(() => {
                setStatus("success");
                // Update user in context so the dashboard banner disappears
                refreshUser().catch(() => {});
            })
            .catch(() => setStatus("error"));
    }, []);

    if (status === "pending") {
        return (
            <div className="max-w-md mx-auto py-12">
                <p className="text-muted-foreground">Verifying your email...</p>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="max-w-md mx-auto py-12">
                <h1 className="text-2xl font-semibold mb-2">Email verified</h1>
                <p className="text-muted-foreground mb-6">Your email address has been confirmed.</p>
                <Link to="/" className="underline text-sm">Go to dashboard</Link>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto py-12">
            <h1 className="text-2xl font-semibold mb-2">Verification failed</h1>
            <p className="text-muted-foreground mb-6">
                The link is invalid or has expired. Request a new one from your dashboard.
            </p>
            <Link to="/" className="underline text-sm">Go to dashboard</Link>
        </div>
    );
}
