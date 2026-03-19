import api from "@/services/api";
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload, TwoFactorChallenge } from "../types/auth";

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/register", payload);
    return res.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse | TwoFactorChallenge> {
    const res = await api.post<AuthResponse | TwoFactorChallenge>("/auth/login", payload);
    return res.data;
}

export async function refreshSession(): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/refresh");
    return res.data;
}

export async function logout(): Promise<void> {
    await api.post("/auth/logout");
}

export async function me(): Promise<{ user: AuthUser }> {
    const res = await api.get<{ user: AuthUser }>("/auth/me");
    return res.data;
}

export async function loginWithOtp(pendingToken: string, code: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/2fa/login", { pendingToken, code });
    return res.data;
}

export async function recoverWithBackupCode(pendingToken: string, backupCode: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/2fa/recover", { pendingToken, backupCode });
    return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put("/auth/password", { currentPassword, newPassword });
}

export async function verifyEmail(token: string): Promise<void> {
    await api.get(`/auth/verify-email?token=${token}`);
}

export async function resendVerificationEmail(): Promise<void> {
    await api.post("/auth/resend-verification");
}

export async function setupTwoFactor(): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const res = await api.post<{ secret: string; qrCodeDataUrl: string }>("/auth/2fa/setup");
    return res.data;
}

export async function confirmTwoFactor(code: string): Promise<{ backupCodes: string[] }> {
    const res = await api.post<{ backupCodes: string[] }>("/auth/2fa/confirm", { code });
    return res.data;
}

export async function disableTwoFactor(code: string): Promise<void> {
    await api.post("/auth/2fa/disable", { code });
}
