import api from "@/services/api";
import { AuthResponse, LoginPayload, RegisterPayload } from "../types/auth";


export async function register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post("/auth/register", payload);
    return res.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await api.post("/auth/login", payload);
    return res.data;
}

export async function refreshSession(): Promise<AuthResponse> {
    const res = await api.post("/auth/refresh");
    return res.data;
}

export async function logout(): Promise<void> {
    await api.post("/auth/logout");
}

export async function me() {
    const res = await api.get("/auth/me");
    return res.data;
}