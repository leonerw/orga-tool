import { createContext } from "react";
import type { AuthUser, LoginPayload, RegisterPayload, TwoFactorChallenge } from "../types/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<TwoFactorChallenge | void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  verifyOtp: (pendingToken: string, code: string) => Promise<void>;
  recoverWithBackupCode: (pendingToken: string, backupCode: string) => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
