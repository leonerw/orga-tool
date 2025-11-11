import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import todoRoutes from "./routes/todo.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// DB verbinden
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("DB Error:", err));

// Routes
app.use("/api/todos", todoRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));