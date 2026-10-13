
const express = require("express");
const pool = require("../config/db");
const { calculateMatchScore } = require("../utils/matchScore");

const router = express.Router();

const VALID_EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "internship",
];

const VALID_JOB_STATUSES = ["draft", "open", "closed"];

const ALLOWED_UPDATE_FIELDS = new Set([
  "title",
  "department",
  "location",
  "employment_type",
  "description",
  "requirements",
  "status",
]);

const OPTIONAL_STRING_FIELDS = [
  "department",
  "location",
  "description",
  "requirements",
];

function isObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function validateJob(body, { partial = false } = {}) {
  if (!isObject(body)) {
    return "Request body must be a JSON object";
  }

  if (
    (!partial || body.title !== undefined) &&
    (typeof body.title !== "string" || !body.title.trim())
  ) {
    return "title must be a non-empty string";
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    if (
      body[field] !== undefined &&
      body[field] !== null &&
      typeof body[field] !== "string"
    ) {
      return `${field} must be a string or null`;
    }
  }

  if (
    body.employment_type !== undefined &&
    body.employment_type !== null &&
    !VALID_EMPLOYMENT_TYPES.includes(body.employment_type)
  ) {
    return "Invalid employment_type";
  }

  if (
    body.status !== undefined &&
    !VALID_JOB_STATUSES.includes(body.status)
  ) {
    return "Invalid status";
  }

  return null;
}

// Recalculate a candidate's score against the latest matching open job.
async function getMatchScore(client, role, skills) {
  if (typeof role !== "string" || !role.trim()) {
    return 0;
  }

  const result = await client.query(
    `SELECT requirements
     FROM public.jobs
     WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
       AND status = 'open'
     ORDER BY created_at DESC
     LIMIT 1`,
    [role]
  );

  if (result.rowCount === 0) {
    return 0;
  }

  return calculateMatchScore(
    Array.isArray(skills) ? skills : [],
    result.rows[0].requirements
  );
}

// GET /api/jobs — list all jobs
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        status,
        created_at,
        updated_at
      FROM public.jobs
      ORDER BY created_at DESC
    `);

    return res.json({
      count: result.rowCount,
      jobs: result.rows,
    });
  } catch (error) {
    console.error("Fetch jobs failed:", error.message);

    return res.status(500).json({
      error: "Failed to fetch jobs",
    });
  }
});

// GET /api/jobs/:id — retrieve one job
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid job ID",
    });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM public.jobs
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    return res.json({
      job: result.rows[0],
    });
  } catch (error) {
    console.error("Fetch job failed:", error.message);

    return res.status(500).json({
      error: "Failed to fetch job",
    });
  }
});

// POST /api/jobs — create a job
router.post("/", async (req, res) => {
  const body = req.body;
  const validationError = validateJob(body);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const {
    title,
    department,
    location,
    employment_type,
    description,
    requirements,
    status,
  } = body;

  try {
    const result = await pool.query(
      `INSERT INTO public.jobs (
        title,
        department,
        location,
        employment_type,
        description,
        requirements,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        title.trim(),
        department?.trim() || null,
        location?.trim() || null,
        employment_type ?? null,
        description?.trim() || null,
        requirements?.trim() || null,
        status ?? "open",
      ]
    );

    return res.status(201).json({
      message: "Job created successfully",
      job: result.rows[0],
    });
  } catch (error) {
    console.error("Create job failed:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "A conflicting record already exists",
      });
    }

    return res.status(500).json({
      error: "Failed to create job",
    });
  }
});

// PATCH /api/jobs/:id — update selected job fields
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid job ID",
    });
  }

  const body = req.body;

  if (!isObject(body)) {
    return res.status(400).json({
      error: "Request body must be a JSON object",
    });
  }

  const fields = Object.keys(body);

  if (fields.length === 0) {
    return res.status(400).json({
      error: "Provide at least one field to update",
    });
  }

  const unsupportedFields = fields.filter(
    (field) => !ALLOWED_UPDATE_FIELDS.has(field)
  );

  if (unsupportedFields.length > 0) {
    return res.status(400).json({
      error: "Unsupported fields in request",
      fields: unsupportedFields,
    });
  }

  const validationError = validateJob(body, { partial: true });

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  let client;
  let inTransaction = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    inTransaction = true;

    const jobResult = await client.query(
      `SELECT *
       FROM public.jobs
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (jobResult.rowCount === 0) {
      await client.query("ROLLBACK");
      inTransaction = false;

      return res.status(404).json({
        error: "Job not found",
      });
    }

    const currentJob = jobResult.rows[0];
    const updatedJob = { ...currentJob };

    for (const field of fields) {
      if (field === "title") {
        updatedJob.title = body.title.trim();
      } else if (OPTIONAL_STRING_FIELDS.includes(field)) {
        updatedJob[field] = body[field]?.trim() || null;
      } else {
        updatedJob[field] = body[field];
      }
    }

    // Column names are selected only from the explicit whitelist above.
    const values = fields.map((field) => updatedJob[field]);

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .concat("updated_at = NOW()")
      .join(", ");

    values.push(id);

    const updateResult = await client.query(
      `UPDATE public.jobs
       SET ${setClause}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const updated = updateResult.rows[0];

    // A renamed job can affect candidates assigned to either its old
    // title or its new title. Recalculate both groups.
    const candidatesResult = await client.query(
      `SELECT id, skills, applied_role
       FROM public.candidates
       WHERE LOWER(TRIM(applied_role)) = LOWER(TRIM($1))
          OR LOWER(TRIM(applied_role)) = LOWER(TRIM($2))
       FOR UPDATE`,
      [currentJob.title, updated.title]
    );

    for (const candidate of candidatesResult.rows) {
      const score = await getMatchScore(
        client,
        candidate.applied_role,
        candidate.skills
      );

      await client.query(
        `UPDATE public.candidates
         SET match_score = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [score, candidate.id]
      );
    }

    await client.query("COMMIT");
    inTransaction = false;

    return res.json({
      message: "Job updated successfully",
      job: updated,
      recalculatedCandidates: candidatesResult.rowCount,
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Job update rollback failed:",
          rollbackError.message
        );
      }
    }

    console.error("Update job failed:", error.message);

    return res.status(500).json({
      error: "Failed to update job",
    });
  } finally {
    client?.release();
  }
});

module.exports = router;
