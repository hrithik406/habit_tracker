import "dotenv/config";
import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import habitRoutes from "./routes/habitRoutes";
import userRoutes  from "./routes/userRoutes";

const app: Application = express();

app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:3000" }));
app.use(express.json());

app.use("/api/habits", habitRoutes);
app.use("/api/users",  userRoutes);

app.get("/api/health", (_req: Request, res: Response) => res.json({ status: "ok" }));

const PORT      = Number(process.env.PORT ?? 5000);
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/habitquest";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err: Error) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

export default app;