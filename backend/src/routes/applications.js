
const express = require("express");
const pool = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const router = express.Router();
const { calculateMatchScore } = require("../utils/matchScore");

const validStages = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

function isObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

// GET /api/applications
router.get("/", authenticateToken, async (req, res) => {
    try {
    const result = await pool.query(`
      SELECT
        a.id,
        a.candidate_id,
        c.full_name AS candidate_name,
        a.job_id,
        j.title AS job_title,
        a.stage,
        a.applied_at,
        a.updated_at
      FROM public.applications AS a
      JOIN public.candidates AS c ON c.id = a.candidate_id
      JOIN public.jobs AS j ON j.id = a.job_id
      ORDER BY a.applied_at DESC
    `);

    return res.json({
      count: result.rowCount,
      applications: result.rows.map((application) => ({
        ...application,
        match_score: calculateMatchScore(
          application.candidate_skills,
          application.job_requirements
        ),
      })),
    });
  } catch (error) {
    console.error("Fetch applications failed:", error.message);

    return res.status(500).json({
      error: "Failed to fetch applications",
    });
  }
});

// POST /api/applications
router.post(
  "/",
  authenticateToken,
  requireRole("admin", "recruiter", "hiring_manager"),
  async (req, res) => {
      if (!isObject(req.body)) {
    return res.status(400).json({
      error: "Request body must be a JSON object",
    });
  }

  const { candidate_id, job_id } = req.body;

  if (
    !Number.isInteger(candidate_id) ||
    candidate_id <= 0 ||
    !Number.isInteger(job_id) ||
    job_id <= 0
  ) {
    return res.status(400).json({
      error: "candidate_id and job_id must be positive integers",
    });
  }

  let client;
  let inTransaction = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    inTransaction = true;

    // Lock the job row while checking its status and creating the application.
    const jobResult = await client.query(
      `SELECT id, status
       FROM public.jobs
       WHERE id = $1
       FOR SHARE`,
      [job_id]
    );

    if (jobResult.rowCount === 0) {
      await client.query("ROLLBACK");
      inTransaction = false;

      return res.status(404).json({
        error: "Job not found",
      });
    }

    if (jobResult.rows[0].status !== "open") {
      await client.query("ROLLBACK");
      inTransaction = false;

      return res.status(409).json({
        error: "Applications can only be submitted for open jobs",
      });
    }

    // The database foreign keys validate that the candidate exists.
    const result = await client.query(
      `INSERT INTO public.applications (candidate_id, job_id)
       VALUES ($1, $2)
       RETURNING *`,
      [candidate_id, job_id]
    );

    await client.query("COMMIT");
    inTransaction = false;

    return res.status(201).json({
      message: "Application created successfully",
      application: result.rows[0],
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Application rollback failed:",
          rollbackError.message
        );
      }
    }

    if (error.code === "23505") {
      return res.status(409).json({
        error: "This candidate has already applied for this job",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        error: "Candidate or job does not exist",
      });
    }

    console.error("Create application failed:", error.message);

    return res.status(500).json({
      error: "Failed to create application",
    });
  } finally {
    client?.release();
  }
});

// PATCH /api/applications/:id/stage
router.patch(
  "/:id/stage",
  authenticateToken,
  requireRole("admin", "recruiter", "hiring_manager"),
  async (req, res) => {
      const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid application ID",
    });
  }

  if (!isObject(req.body) || typeof req.body.stage !== "string") {
    return res.status(400).json({
      error: "stage is required and must be a string",
      validStages,
    });
  }

  const stage = req.body.stage.trim().toLowerCase();

  if (!validStages.includes(stage)) {
    return res.status(400).json({
      error: "Invalid application stage",
      validStages,
    });
  }

  try {
    const result = await pool.query(
      `UPDATE public.applications
       SET stage = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [stage, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Application not found",
      });
    }

    return res.json({
      message: "Application stage updated successfully",
      application: result.rows[0],
    });
  } catch (error) {
    console.error("Update application failed:", error.message);

    return res.status(500).json({
      error: "Failed to update application",
    });
  }
});

module.exports = router;
