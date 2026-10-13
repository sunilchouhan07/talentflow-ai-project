
const express = require("express");
const pool = require("../config/db");
const { calculateMatchScore } = require("../utils/matchScore");

const router = express.Router();

const validStatuses = [
  "new",
  "screening",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
];

// Frontend sends `stage`; database stores the candidate status.
const validStageMap = Object.freeze({
  new: "new",
  screening: "screening",
  shortlisted: "shortlisted",
  interview: "interview",
  offered: "offered",
  hired: "hired",
  rejected: "rejected",
});

function isObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function validateCandidateFields(body, { partial = false } = {}) {
  if (!isObject(body)) {
    return "Request body must be a JSON object";
  }

  if (
    (!partial || body.full_name !== undefined) &&
    (typeof body.full_name !== "string" || !body.full_name.trim())
  ) {
    return "full_name must be a non-empty string";
  }

  if (
    body.email !== undefined &&
    body.email !== null &&
    body.email !== "" &&
    (typeof body.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
  ) {
    return "email must be a valid email address";
  }

  if (
    body.phone !== undefined &&
    body.phone !== null &&
    typeof body.phone !== "string"
  ) {
    return "phone must be a string";
  }

  if (
    body.skills !== undefined &&
    (!Array.isArray(body.skills) ||
      !body.skills.every((skill) => typeof skill === "string"))
  ) {
    return "skills must be an array of strings";
  }

  if (
    body.experience_years !== undefined &&
    body.experience_years !== null &&
    body.experience_years !== "" &&
    (!Number.isFinite(Number(body.experience_years)) ||
      Number(body.experience_years) < 0 ||
      Number(body.experience_years) > 999.9)
  ) {
    return "experience_years must be between 0 and 999.9";
  }

  if (
    body.applied_role !== undefined &&
    body.applied_role !== null &&
    typeof body.applied_role !== "string"
  ) {
    return "applied_role must be a string";
  }

  if (
    body.resume_url !== undefined &&
    body.resume_url !== null &&
    body.resume_url !== ""
  ) {
    if (typeof body.resume_url !== "string") {
      return "resume_url must be a valid HTTP or HTTPS URL";
    }

    try {
      const url = new URL(body.resume_url);

      if (!["http:", "https:"].includes(url.protocol)) {
        return "resume_url must use HTTP or HTTPS";
      }
    } catch {
      return "resume_url must be a valid HTTP or HTTPS URL";
    }
  }

  if (
    body.status !== undefined &&
    body.status !== null &&
    !validStatuses.includes(body.status)
  ) {
    return "Invalid candidate status";
  }

  return null;
}

// Find the latest open job matching the candidate's role.
async function getMatchScore(client, role, skills, lockJob = false) {
  if (!role) {
    return 0;
  }

  const result = await client.query(
    `SELECT requirements
     FROM public.jobs
     WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
       AND status = 'open'
     ORDER BY created_at DESC
     LIMIT 1
     ${lockJob ? "FOR SHARE" : ""}`,
    [role]
  );

  if (result.rowCount === 0) {
    return 0;
  }

  return calculateMatchScore(skills, result.rows[0].requirements);
}

// GET /api/candidates
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        phone,
        skills,
        experience_years,
        applied_role,
        match_score,
        resume_url,
        status,
        created_at,
        updated_at
      FROM public.candidates
      ORDER BY created_at DESC
    `);

    return res.json({
      count: result.rowCount,
      candidates: result.rows,
    });
  } catch (error) {
    console.error("Fetch candidates failed:", error.message);

    return res.status(500).json({
      error: "Failed to fetch candidates",
    });
  }
});

// POST /api/candidates
router.post("/", async (req, res) => {
  const body = req.body;

  const validationError = validateCandidateFields(body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const {
    full_name,
    email,
    phone,
    skills,
    experience_years,
    applied_role,
    resume_url,
    status,
  } = body;

  const candidateSkills = (skills || []).map((skill) => skill.trim());
  const role = applied_role?.trim() || null;

  let client;
  let inTransaction = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    inTransaction = true;

    const matchScore = await getMatchScore(
      client,
      role,
      candidateSkills,
      true
    );

    const result = await client.query(
      `INSERT INTO public.candidates (
        full_name,
        email,
        phone,
        skills,
        experience_years,
        applied_role,
        match_score,
        resume_url,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        full_name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        candidateSkills,
        experience_years == null || experience_years === ""
          ? null
          : Number(experience_years),
        role,
        matchScore,
        resume_url?.trim() || null,
        status ?? "new",
      ]
    );

    await client.query("COMMIT");
    inTransaction = false;

    return res.status(201).json({
      message: "Candidate created successfully",
      candidate: result.rows[0],
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Create candidate rollback failed:", rollbackError.message);
      }
    }

    console.error("Create candidate failed:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "A conflicting record already exists",
      });
    }

    return res.status(500).json({
      error: "Failed to create candidate",
    });
  } finally {
    client?.release();
  }
});

// PUT /api/candidates/:id
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid candidate ID" });
  }

  const body = req.body;
  const validationError = validateCandidateFields(body, { partial: true });

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  let client;
  let inTransaction = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    inTransaction = true;

    const currentResult = await client.query(
      `SELECT *
       FROM public.candidates
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      inTransaction = false;

      return res.status(404).json({
        error: "Candidate not found",
      });
    }

    const current = currentResult.rows[0];

    const updatedSkills =
      body.skills !== undefined
        ? body.skills.map((skill) => skill.trim())
        : current.skills || [];

    const updatedRole =
      body.applied_role !== undefined
        ? body.applied_role?.trim() || null
        : current.applied_role;

    const matchScore = await getMatchScore(
      client,
      updatedRole,
      updatedSkills
    );

    const result = await client.query(
      `UPDATE public.candidates
       SET
         full_name = $1,
         email = $2,
         phone = $3,
         skills = $4,
         experience_years = $5,
         applied_role = $6,
         resume_url = $7,
         match_score = $8,
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        body.full_name !== undefined
          ? body.full_name.trim()
          : current.full_name,
        body.email !== undefined
          ? body.email?.trim() || null
          : current.email,
        body.phone !== undefined
          ? body.phone?.trim() || null
          : current.phone,
        updatedSkills,
        body.experience_years !== undefined
          ? body.experience_years == null || body.experience_years === ""
            ? null
            : Number(body.experience_years)
          : current.experience_years,
        updatedRole,
        body.resume_url !== undefined
          ? body.resume_url?.trim() || null
          : current.resume_url,
        matchScore,
        id,
      ]
    );

    await client.query("COMMIT");
    inTransaction = false;

    return res.json({
      message: "Candidate updated and match score recalculated",
      candidate: result.rows[0],
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Update candidate rollback failed:", rollbackError.message);
      }
    }

    console.error("Update candidate profile failed:", error.message);

    return res.status(500).json({
      error: "Failed to update candidate profile",
    });
  } finally {
    client?.release();
  }
});

// PATCH /api/candidates/:id/status
router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid candidate ID",
    });
  }

  if (!isObject(req.body) || typeof req.body.stage !== "string") {
    return res.status(400).json({
      error: "stage is required and must be a string",
      validStages: Object.keys(validStageMap),
    });
  }

  const stage = req.body.stage.trim().toLowerCase();
  const status = validStageMap[stage];

  if (!status) {
    return res.status(400).json({
      error: "Invalid candidate stage",
      validStages: Object.keys(validStageMap),
    });
  }

  try {
    const result = await pool.query(
      `UPDATE public.candidates
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, full_name, status, updated_at`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Candidate not found",
      });
    }

    return res.json({
      message: "Candidate stage updated successfully",
      candidate: result.rows[0],
    });
  } catch (error) {
    console.error("Update candidate stage failed:", error.message);

    return res.status(500).json({
      error: "Failed to update candidate stage",
    });
  }
});

module.exports = router;
