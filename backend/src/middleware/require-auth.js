import { verifyAccessToken } from "../utils/auth.js";

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ message: "Missing access token" });
    }

    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}
