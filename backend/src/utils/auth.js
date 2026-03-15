import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";



const getAccessTokenSecret = () => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not configured");
  return secret;
};
const getAccessTokenTtl = () => process.env.ACCESS_TOKEN_TTL || "15m";
const getRememberDays = () => Number(process.env.REFRESH_TOKEN_TTL_REMEMBER_DAYS || 30);
const getSessionDays = () => Number(process.env.REFRESH_TOKEN_TTL_SESSION_DAYS || 1);



export const hashPassword = async (password) => bcrypt.hash(password, 12);
export const comparePassword = async (password, passwordHash) => bcrypt.compare(password, passwordHash);



export const signAccessToken = (user) => 
  jwt.sign(
    { sub: user._id.toString(), email: user.email },
    getAccessTokenSecret(),
    { expiresIn: getAccessTokenTtl() }
  );

export const verifyAccessToken = (token) =>
  jwt.verify(token, getAccessTokenSecret());

export const generateRefreshToken = () =>
  crypto.randomBytes(64).toString("hex");

export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getRefreshTtlMs = (rememberMe) =>
  (rememberMe ? getRememberDays() : getSessionDays()) * 24 * 60 * 60 * 1000;
