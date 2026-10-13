
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

const validTypes = ["technical", "behavioral", "hr", "other"];
const validStatuses = ["scheduled", "completed", "cancelled", "rescheduled"];

// GET /api/interviews
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id,
        i.application_id,
        c.full_name AS candidate_name,
        j.title AS job_title,
        i.scheduled_at,
        i.interview_type,
        i.interviewer_name,
        i.status,
        i.feedback,
        i.created_at
      FROM interviews i
      JOIN applications a ON a.id = i.application_id
      JOIN candidates c ON c.id = a.candidate_id
      JOIN jobs j ON j.id = a.job_id
      ORDER BY i.scheduled_at ASC
    `);

    res.json({
      count: result.rowCount,
      interviews: result.rows,
    });
  } catch (error) {
    console.error("Fetch interviews failed:", error.message);
    res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

// POST /api/interviews
router.post("/", async (req, res) => {
  const {
    application_id,
    scheduled_at,
    interview_type = "technical",
    interviewer_name,
  } = req.body;

  if (!Number.isInteger(application_id) || application_id <= 0) {
    return res.status(400).json({
      error: "application_id must be a positive integer",
    });
  }

  if (!scheduled_at || Number.isNaN(Date.parse(scheduled_at))) {
    return res.status(400).json({
      error: "A valid scheduled_at date is required",
    });
  }

  if (!validTypes.includes(interview_type)) {
    return res.status(400).json({ error: "Invalid interview_type" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO interviews
        (application_id, scheduled_at, interview_type, interviewer_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        application_id,
        scheduled_at,
        interview_type,
        interviewer_name || null,
      ]
    );

    res.status(201).json({
      message: "Interview scheduled successfully",
      interview: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({
        error: "Application does not exist",
      });
    }

    console.error("Schedule interview failed:", error.message);
    res.status(500).json({ error: "Failed to schedule interview" });
  }
});

// PATCH /api/interviews/:id
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid interview ID" });
  }

  const allowedFields = ["scheduled_at", "interview_type", "interviewer_name", "status", "feedback"];
  const entries = Object.entries(req.body).filter(([key]) =>
    allowedFields.includes(key)
  );

  if (entries.length === 0) {
    return res.status(400).json({
      error: "Provide at least one supported field to update",
    });
  }

  for (const [key, value] of entries) {
    if (key === "scheduled_at" && Number.isNaN(Date.parse(value))) {
      return res.status(400).json({ error: "Invalid scheduled_at date" });
    }

    if (key === "interview_type" && !validTypes.includes(value)) {
      return res.status(400).json({ error: "Invalid interview_type" });
    }

    if (key === "status" && !validStatuses.includes(value)) {
      return res.status(400).json({ error: "Invalid status" });
    }
  }

  const values = entries.map(([, value]) => value);
  const setClause = entries
    .map(([key], index) => `${key} = $${index + 1}`)
    .concat("updated_at = NOW()")
    .join(", ");

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE interviews SET ${setClause}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Interview not found" });
    }

    res.json({
      message: "Interview updated successfully",
      interview: result.rows[0],
    });
  } catch (error) {
    console.error("Update interview failed:", error.message);
    res.status(500).json({ error: "Failed to update interview" });
  }
});

module.exports = router;

