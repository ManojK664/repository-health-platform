
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import repositoryRoutes from "./repository.routes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Repository Health Intelligence Platform API",
  });
});

// Health-check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "repository-health-api",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Repository analysis routes
app.use("/api/repository", repositoryRoutes);

// Start server
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
