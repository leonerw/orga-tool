import { useEffect, useMemo, useState } from "react";
import { login as loginApi, logout as logoutApi, refreshSession, register as registerApi } from "../api/auth";
import api, { setAccessToken } from "@/services/api";
import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthContext } from "./AuthContext";



let sharedRefreshPromise: Promise<ReturnType<typeof refreshSession> extends Promise<infer T> ? T : never> | null = null;

function refreshSessionOnce() {
  if (!sharedRefreshPromise) {
    sharedRefreshPromise = refreshSession().finally(() => {
      sharedRefreshPromise = null;
    });
  }
  return sharedRefreshPromise;
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setToken] = useState<string | null>(null);
    const [isBootstrapping, setBootstrapping] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await refreshSessionOnce();
                setUser(data.user);
                setToken(data.accessToken);
                setAccessToken(data.accessToken);
            } catch {
                setUser(null);
                setToken(null);
                setAccessToken(null);
            } finally {
                setBootstrapping(false);
            }
        })();
    }, []);

    useEffect(() => {
        let refreshPromise: Promise<string | null> | null = null;

        const interceptorId = api.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
            const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
            const status = error.response?.status;
            const url = originalRequest?.url || "";

            if (!originalRequest || status !== 401) {
                return Promise.reject(error);
            }

            // never retry auth endpoints to avoid loops
            if (
                url.includes("/auth/login") ||
                url.includes("/auth/register") ||
                url.includes("/auth/refresh") ||
                url.includes("/auth/logout")
            ) {
                return Promise.reject(error);
            }

            if (originalRequest._retry) {
                return Promise.reject(error);
            }
            originalRequest._retry = true;

            try {
                if (!refreshPromise) {
                refreshPromise = (async () => {
                    const data = await refreshSessionOnce();
                    setUser(data.user);
                    setToken(data.accessToken);
                    setAccessToken(data.accessToken);
                    return data.accessToken;
                })().finally(() => {
                    refreshPromise = null;
                });
                }

                const newToken = await refreshPromise;
                if (!newToken) {
                throw new Error("No refreshed token");
                }

                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                setUser(null);
                setToken(null);
                setAccessToken(null);
                return Promise.reject(refreshError);
            }
            }
        );

        return () => {
            api.interceptors.response.eject(interceptorId);
        };
    }, []);


    async function login(payload: LoginPayload) {
        const data = await loginApi(payload);
        setUser(data.user);
        setToken(data.accessToken);
        setAccessToken(data.accessToken);
    }

    async function register(payload: RegisterPayload) {
        const data = await registerApi(payload);
        setUser(data.user);
        setToken(data.accessToken);
        setAccessToken(data.accessToken);
    }

    async function logout() {
        await logoutApi();
        setUser(null);
        setToken(null);
        setAccessToken(null);
    }

    const value = useMemo(() => ({
        user,
        accessToken,
        isAuthenticated: Boolean(user && accessToken),
        isBootstrapping,
        login,
        register,
        logout
    }), [user, accessToken, isBootstrapping]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
