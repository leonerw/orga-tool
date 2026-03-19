import User from "../models/user.model.js";
import AuthSession from "../models/auth-session.model.js";
import {
  comparePassword,
  generateRefreshToken,
  getRefreshTtlMs,
  hashBackupCode,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  signEmailVerifyToken,
  signTwoFactorPendingToken,
  verifyEmailVerifyToken,
  verifyTwoFactorPendingToken,
} from "../utils/auth.js";
import {
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
} from "../utils/auth-cookie.js";
import { sendVerificationEmail } from "../utils/email.js";
import { verifyTotpCode } from "../utils/totp.js";

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName,
  emailVerified: user.emailVerified,
  twoFactorEnabled: user.twoFactorEnabled,
});

const getClientMeta = (req) => ({
  userAgent: req.get("user-agent") || "",
  ip: req.ip || "",
});

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseRegisterBody(body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const rememberMe = Boolean(body.rememberMe);

  return { email, password, displayName, rememberMe };
}

function parseLoginBody(body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rememberMe = Boolean(body.rememberMe);

  return { email, password, rememberMe };
}

async function createSessionAndTokens({ user, rememberMe, req, res, fixedExpiresAt = null }) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const ttlMs = getRefreshTtlMs(rememberMe);
  const now = Date.now();
  const expiresAt = fixedExpiresAt ? new Date(fixedExpiresAt) : new Date(now + ttlMs);

  // For refresh rotation, cookie must only live until original fixed expiry.
  const cookieMaxAgeMs = fixedExpiresAt
    ? Math.max(1, expiresAt.getTime() - now)
    : ttlMs;

  const meta = getClientMeta(req);

  await AuthSession.create({
    userId: user._id,
    refreshTokenHash,
    expiresAt,
    revokedAt: null,
    rememberMe,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  setRefreshTokenCookie(res, refreshToken, cookieMaxAgeMs);

  return { accessToken };
}


export async function register(req, res) {
  try {
    const { email, password, displayName, rememberMe } = parseRegisterBody(req.body);

    if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(displayName)) {
      return res.status(400).json({ message: "Email, password and displayName are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      displayName,
    });

    const verifyToken = signEmailVerifyToken(user._id);
    // Fire-and-forget — don't fail registration if email sending fails
    sendVerificationEmail(email, verifyToken).catch((err) => {
      console.error("[email] Failed to send verification email:", err.message);
    });

    const { accessToken } = await createSessionAndTokens({ user, rememberMe, req, res });

    return res.status(201).json({
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already in use" });
    }
    return res.status(500).json({ message: "Error registering user" });
  }
}

export async function login(req, res) {
  try {
    const { email, password, rememberMe } = parseLoginBody(req.body);

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.twoFactorEnabled) {
      const pendingToken = signTwoFactorPendingToken(user._id, rememberMe);
      return res.json({ step: "otp_required", pendingToken });
    }

    const { accessToken } = await createSessionAndTokens({ user, rememberMe, req, res });

    return res.json({
      accessToken,
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ message: "Error logging in" });
  }
}

export async function refresh(req, res) {
  try {
    const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!incomingToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const incomingHash = hashRefreshToken(incomingToken);

    // Check without revokedAt filter first to detect token reuse
    const anySession = await AuthSession.findOne({ refreshTokenHash: incomingHash });

    if (!anySession) {
      return res.status(401).json({ message: "Invalid refresh session" });
    }

    if (anySession.revokedAt !== null) {
      // Token already used — potential theft, revoke all sessions for this user
      await AuthSession.updateMany(
        { userId: anySession.userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: "Invalid refresh session" });
    }

    const session = anySession;

    if (session.expiresAt.getTime() <= Date.now()) {
      await AuthSession.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: "Refresh session expired" });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      await AuthSession.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: "Invalid refresh session" });
    }

    await AuthSession.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });

    const { accessToken } = await createSessionAndTokens({
      user,
      rememberMe: session.rememberMe,
      req,
      res,
      fixedExpiresAt: session.expiresAt,
    });

    return res.json({
      accessToken,
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ message: "Error refreshing session" });
  }
}

export async function logout(req, res) {
  try {
    const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (incomingToken) {
      const incomingHash = hashRefreshToken(incomingToken);
      await AuthSession.updateOne(
        { refreshTokenHash: incomingHash, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    clearRefreshTokenCookie(res);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Error logging out" });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch {
    return res.status(500).json({ message: "Error fetching user" });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must differ from current password" });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Revoke all other sessions — keep only the one associated with the current refresh cookie
    const currentRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    let currentSessionId = null;
    if (currentRefreshToken) {
      const hash = hashRefreshToken(currentRefreshToken);
      const session = await AuthSession.findOne({ refreshTokenHash: hash, revokedAt: null });
      if (session) currentSessionId = session._id;
    }

    const revokeFilter = { userId: user._id, revokedAt: null };
    if (currentSessionId) revokeFilter._id = { $ne: currentSessionId };
    await AuthSession.updateMany(revokeFilter, { $set: { revokedAt: new Date() } });

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Error changing password" });
  }
}

export async function verifyEmail(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Verification token missing" });
    }

    const payload = verifyEmailVerifyToken(token);
    await User.updateOne({ _id: payload.sub }, { $set: { emailVerified: true } });

    return res.json({ message: "Email verified successfully" });
  } catch {
    return res.status(400).json({ message: "Invalid or expired verification link" });
  }
}

export async function resendVerificationEmail(req, res) {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const token = signEmailVerifyToken(user._id);
    await sendVerificationEmail(user.email, token);

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Error sending verification email" });
  }
}

export async function loginWithTwoFactor(req, res) {
  try {
    const { pendingToken, code } = req.body;

    if (!pendingToken || !code) {
      return res.status(400).json({ message: "Pending token and code are required" });
    }

    const payload = verifyTwoFactorPendingToken(pendingToken);
    const user = await User.findById(payload.sub);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(401).json({ message: "Invalid session" });
    }

    if (!verifyTotpCode(user.twoFactorSecret, String(code))) {
      return res.status(401).json({ message: "Invalid code" });
    }

    const { accessToken } = await createSessionAndTokens({
      user,
      rememberMe: payload.rememberMe,
      req,
      res,
    });

    return res.json({ accessToken, user: sanitizeUser(user) });
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

export async function recoverWithBackupCode(req, res) {
  try {
    const { pendingToken, backupCode } = req.body;

    if (!pendingToken || !backupCode) {
      return res.status(400).json({ message: "Pending token and backup code are required" });
    }

    const payload = verifyTwoFactorPendingToken(pendingToken);
    const user = await User.findById(payload.sub);

    if (!user || !user.twoFactorEnabled) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const hash = hashBackupCode(String(backupCode));
    const codeIndex = user.backupCodeHashes.indexOf(hash);

    if (codeIndex === -1) {
      return res.status(401).json({ message: "Invalid backup code" });
    }

    // Invalidate the used backup code
    user.backupCodeHashes.splice(codeIndex, 1);
    await user.save();

    const { accessToken } = await createSessionAndTokens({
      user,
      rememberMe: payload.rememberMe,
      req,
      res,
    });

    return res.json({ accessToken, user: sanitizeUser(user) });
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}
