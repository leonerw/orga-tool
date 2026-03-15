import User from "../models/user.model.js";
import AuthSession from "../models/auth-session.model.js";
import {
  comparePassword,
  generateRefreshToken,
  getRefreshTtlMs,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "../utils/auth.js";
import {
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
} from "../utils/auth-cookie.js";

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  displayName: user.displayName,
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

async function createSessionAndTokens({ user, rememberMe, req, res }) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const ttlMs = getRefreshTtlMs(rememberMe);
  const expiresAt = new Date(Date.now() + ttlMs);
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

  setRefreshTokenCookie(res, refreshToken, ttlMs);

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

    const { accessToken } = await createSessionAndTokens({ user, rememberMe, req, res });

    return res.status(201).json({
      accessToken,
      user: sanitizeUser(user),
    });
  } catch {
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
    const session = await AuthSession.findOne({
      refreshTokenHash: incomingHash,
      revokedAt: null,
    });

    if (!session) {
      return res.status(401).json({ message: "Invalid refresh session" });
    }

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
    const authHeader = req.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ message: "Missing access token" });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Invalid access token" });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}