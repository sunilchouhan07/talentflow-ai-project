
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

const candidateRoutes = require("./routes/candidates");
const jobRoutes = require("./routes/jobs");
const applicationRoutes = require("./routes/applications");
const interviewRoutes = require("./routes/interviews");
const aiRoutes = require("./routes/ai");

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/candidates", candidateRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "TalentFlow AI Backend",
    timestamp: new Date().toISOString(),
  });
});

// Database health check
app.get("/api/db-health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    res.json({
      status: "connected",
      database: result.rows[0].database,
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      status: "disconnected",
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`TalentFlow API running on http://localhost:${PORT}`);
});
