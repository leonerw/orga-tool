import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import todoRoutes from "./routes/todo.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { requireAuth } from "./middleware/require-auth.js";

dotenv.config();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Rate limiting is disabled in test environment
  if (process.env.NODE_ENV !== "test") {
    app.post("/api/auth/login", authLimiter);
    app.post("/api/auth/register", authLimiter);
    app.post("/api/auth/refresh", refreshLimiter);
    app.post("/api/auth/2fa/login", authLimiter);
    app.post("/api/auth/2fa/recover", authLimiter);
  }

  app.use("/api/auth", authRoutes);
  app.use("/api/todos", requireAuth, todoRoutes);

  return app;
}
