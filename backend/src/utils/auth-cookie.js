const isProd = process.env.NODE_ENV === "production";

export const REFRESH_COOKIE_NAME = "refreshToken";

export function setRefreshTokenCookie(res, token, maxAgeMs) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,                          // not readable by JS — XSS protection
    secure: isProd,                          // HTTPS-only in production
    sameSite: isProd ? "none" : "lax",       // "none" required for cross-origin cookies in prod
    maxAge: maxAgeMs,
    path: "/api/auth",                       // scoped so the cookie isn't sent on every request
  });
}

export function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth",
  });
}
