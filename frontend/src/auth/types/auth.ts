export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface TwoFactorChallenge {
  step: "otp_required";
  pendingToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterPayload extends LoginPayload {
  displayName: string;
}
