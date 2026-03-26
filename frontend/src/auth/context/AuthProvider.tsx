import { useEffect, useMemo, useState } from "react";
import {
  login as loginApi,
  loginWithOtp,
  logout as logoutApi,
  me,
  recoverWithBackupCode as recoverApi,
  refreshSession,
  register as registerApi,
} from "../api/auth";
import api, { setAccessToken } from "@/services/api";
import type { AuthUser, LoginPayload, RegisterPayload, TwoFactorChallenge } from "../types/auth";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthContext } from "./AuthContext";


// Module-level singleton so concurrent refresh calls (e.g. multiple parallel
// requests all returning 401) share a single in-flight refresh rather than
// each triggering their own.
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
    // --- State ---
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setToken] = useState<string | null>(null);
    const [isBootstrapping, setBootstrapping] = useState(true);

    // --- Session bootstrap ---
    // On mount, attempt a silent refresh to restore an existing session.
    // isBootstrapping stays true until this resolves so RequireAuth doesn't
    // flash a redirect before the session is known.
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

    // --- 401 interceptor ---
    // Catches 401 responses from any non-auth endpoint, silently refreshes the
    // session, and retries the original request once. Ejected on unmount.
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
            // TODO: also skip /auth/2fa/login and /auth/2fa/recover here — a wrong TOTP/backup
            // code returns 401, which currently triggers an unnecessary refresh attempt before
            // the error is propagated. The refresh fails (no session yet) and the correct error
            // still reaches the UI, but it wastes a round trip.
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

    // --- Auth actions ---

    async function login(payload: LoginPayload): Promise<TwoFactorChallenge | void> {
        const data = await loginApi(payload);
        if ("step" in data) {
            return data;
        }
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
        try {
            await logoutApi();
        } catch {
            // server-side revocation failed — clear local state regardless
        }
        setUser(null);
        setToken(null);
        setAccessToken(null);
    }

    async function verifyOtp(pendingToken: string, code: string) {
        const data = await loginWithOtp(pendingToken, code);
        setUser(data.user);
        setToken(data.accessToken);
        setAccessToken(data.accessToken);
    }

    async function recoverWithBackupCode(pendingToken: string, backupCode: string) {
        const data = await recoverApi(pendingToken, backupCode);
        setUser(data.user);
        setToken(data.accessToken);
        setAccessToken(data.accessToken);
    }

    async function refreshUser() {
        const data = await me();
        setUser(data.user);
    }

    // --- Context value ---

    const value = useMemo(() => ({
        user,
        accessToken,
        isAuthenticated: Boolean(user && accessToken),
        isBootstrapping,
        login,
        register,
        logout,
        verifyOtp,
        recoverWithBackupCode,
        refreshUser,
    }), [user, accessToken, isBootstrapping]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
