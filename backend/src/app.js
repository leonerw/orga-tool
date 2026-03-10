import express from "express";
import cors from "cors";
import todoRoutes from "./routes/todo.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/todos", todoRoutes);

  return app;
}
