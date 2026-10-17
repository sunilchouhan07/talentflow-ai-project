const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/auth");

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const express = require("express");
const pool = require("../config/db");
const { calculateMatchScore } = require("../utils/matchScore");

const router = express.Router();

const RESUME_BUCKET = process.env.RESUME_BUCKET;
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

const s3 = new S3Client({
  region: AWS_REGION,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  
  fileFilter: (req, file, callback) => {
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      const error = new Error(
        "Only PDF, DOC, and DOCX files are allowed."
      );
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

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

  if (body.skills !== undefined) {
  let candidateSkills = body.skills;

  if (typeof candidateSkills === "string") {
    try {
      candidateSkills = JSON.parse(candidateSkills);
    } catch {
      return "skills must be a valid array of strings";
    }
  }

  if (
    !Array.isArray(candidateSkills) ||
    !candidateSkills.every(
      (skill) => typeof skill === "string"
    )
  ) {
    return "skills must be an array of strings";
  }
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
    if (
      typeof body.resume_url !== "string" ||
      body.resume_url.length > 1024 ||
      !/^resumes\/[a-zA-Z0-9-]+\.(pdf|doc|docx)$/i.test(
        body.resume_url
      )
    ) {
      return "resume_url must be a valid resume S3 object key";
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
// async function getMatchScore(client, role, skills, lockJob = false) {
//   if (!role) {
//     return 0;
//   }

//   const result = await client.query(
//     `SELECT requirements
//      FROM public.jobs
//      WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
//        AND status = 'open'
//      ORDER BY created_at DESC
//      LIMIT 1
//      ${lockJob ? "FOR SHARE" : ""}`,
//     [role]
//   );

//   if (result.rowCount === 0) {
//     return 0;
//   }

//   return calculateMatchScore(skills, result.rows[0].requirements);
// }

async function getMatchScore(client, role, skills, lockJob = false) {
  if (!role) {
    console.log("[MatchScore] Missing candidate role");
    return 0;
  }

  const result = await client.query(
    `SELECT id, title, requirements, status
     FROM public.jobs
     WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
       AND status = 'open'
     ORDER BY created_at DESC
     LIMIT 1
     ${lockJob ? "FOR SHARE" : ""}`,
    [role]
  );

  console.log("[MatchScore] Role:", role);
  console.log("[MatchScore] Candidate skills:", skills);
  console.log("[MatchScore] Matching jobs:", result.rows);

  if (result.rowCount === 0) {
    console.log("[MatchScore] No matching open job found");
    return 0;
  }

  const score = calculateMatchScore(
    skills,
    result.rows[0].requirements
  );

  console.log("[MatchScore] Calculated score:", score);
  return score;
}


// GET /api/candidates

router.get("/:id/resume", authenticateToken, async (req, res) => {
      try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid candidate ID" });
    }

    const result = await pool.query(
      `SELECT resume_url
       FROM public.candidates
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const resumeKey = result.rows[0].resume_url;

    if (!resumeKey) {
      return res.status(404).json({ error: "No resume available for this candidate" });
    }

    // Accept only keys in the resumes/ folder.
    if (!/^resumes\/[a-zA-Z0-9-]+\.(pdf|doc|docx)$/i.test(resumeKey)) {
      return res.status(400).json({ error: "Invalid resume storage key" });
    }

    const url = await getSignedUrl(
      s3,
      new (require("@aws-sdk/client-s3").GetObjectCommand)({
        Bucket: RESUME_BUCKET,
        Key: resumeKey,
        ResponseContentDisposition: `attachment; filename="${resumeKey.split("/").pop()}"`,
      }),
      { expiresIn: 300 }
    );

    return res.json({
      downloadUrl: url,
      expiresIn: 300,
    });
  } catch (error) {
    console.error("Resume download URL failed:", error.message);
    return res.status(500).json({ error: "Failed to generate resume download link" });
  }
});

router.get("/", authenticateToken, async (req, res) => {  try {
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

router.post(
  "/",
  authenticateToken,
  requireRole("admin", "recruiter", "hiring_manager"),
  (req, res, next) => {
      upload.single("resume")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: "Resume file must be 5 MB or smaller.",
        });
      }

      if (err.code === "LIMIT_FILE_COUNT" ||
          err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          error: "Invalid resume upload.",
        });
      }

      if (err.status === 400) {
        return res.status(400).json({
          error: err.message,
        });
      }

      return next(err);
    }

    next();
  });
}, async (req, res) => 
  {
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
      status,
    } = body;

    let candidateSkills;

    try {
      candidateSkills = Array.isArray(skills)
        ? skills
        : typeof skills === "string"
          ? JSON.parse(skills)
          : [];

      if (
        !Array.isArray(candidateSkills) ||
        !candidateSkills.every(
          (skill) => typeof skill === "string"
        )
      ) {
        return res.status(400).json({
          error: "Skills must be an array of strings.",
        });
      }

      candidateSkills = candidateSkills
        .map((skill) => skill.trim())
        .filter(Boolean);
    } catch {
      return res.status(400).json({
        error: "Skills must be a valid array of strings.",
      });
    }

    const role = applied_role?.trim() || null;

    if (req.file && !RESUME_BUCKET) {
      return res.status(500).json({
        error: "Resume storage is not configured",
      });
    }

    let client;
    let inTransaction = false;
    let uploadedKey = null;

    try {
      // Validate the file's actual content, not only its extension.
      if (req.file) {
        const file = req.file;
        const extension = path.extname(file.originalname).toLowerCase();

        const isPdf = file.mimetype === "application/pdf" &&
          file.buffer.subarray(0, 5).toString() === "%PDF-";

        const isDoc = file.mimetype === "application/msword" &&
          file.buffer.subarray(0, 8).toString("hex") ===
            "d0cf11e0a1b11ae1";

        const isDocx =
          file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
          file.buffer.subarray(0, 2).toString() === "PK";

        if (
          !(
            (extension === ".pdf" && isPdf) ||
            (extension === ".doc" && isDoc) ||
            (extension === ".docx" && isDocx)
          )
        ) {
          return res.status(400).json({
            error: "The uploaded file does not match a supported resume format",
          });
        }
      }

      client = await pool.connect();
      await client.query("BEGIN");
      inTransaction = true;

      const matchScore = await getMatchScore(
        client,
        role,
        candidateSkills,
        true
      );

      // Upload to private S3 before inserting the database record.
      if (req.file) {
        uploadedKey =
          `resumes/${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: RESUME_BUCKET,
            Key: uploadedKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ServerSideEncryption: "AES256",
          })
        );
      }

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
          uploadedKey,
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
      if (inTransaction && client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Candidate rollback failed:", rollbackError.message);
        }
      }

      // Avoid leaving an uploaded object behind if database insertion fails.
      if (uploadedKey && RESUME_BUCKET) {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: RESUME_BUCKET,
              Key: uploadedKey,
            })
          );
        } catch (cleanupError) {
          console.error("Resume cleanup failed:", cleanupError.message);
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
router.put(
  "/:id",
  authenticateToken,
  requireRole("admin", "recruiter", "hiring_manager"),
  async (req, res) => {
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
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole("admin", "recruiter", "hiring_manager"),
  async (req, res) => {
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


/**
 * DELETE /api/candidates/:id
 * Permanently deletes a candidate, their applications and interviews,
 * and their associated private S3 resume.
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    
    const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "Invalid candidate ID",
    });
  }

  let client;
  let inTransaction = false;
  let resumeKey = null;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    inTransaction = true;

    // Lock the candidate while deleting their related records.
    const candidateResult = await client.query(
      `SELECT id, resume_url
       FROM public.candidates
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (candidateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      inTransaction = false;

      return res.status(404).json({
        error: "Candidate not found",
      });
    }

    resumeKey = candidateResult.rows[0].resume_url;

    // Delete interviews belonging to this candidate's applications.
    await client.query(
      `DELETE FROM public.interviews
       WHERE application_id IN (
         SELECT id
         FROM public.applications
         WHERE candidate_id = $1
       )`,
      [id]
    );

    // Delete the candidate's applications.
    await client.query(
      `DELETE FROM public.applications
       WHERE candidate_id = $1`,
      [id]
    );

    // Finally, delete the candidate.
    await client.query(
      `DELETE FROM public.candidates
       WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");
    inTransaction = false;
  } catch (error) {
    if (inTransaction && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Candidate deletion rollback failed:",
          rollbackError.message
        );
      }
    }

    console.error("Delete candidate failed:", error.message);

    return res.status(500).json({
      error: "Failed to delete candidate",
    });
  } finally {
    client?.release();
  }

  // PostgreSQL deletion has committed. Clean up the private S3 object.
  if (resumeKey) {
    if (
      !RESUME_BUCKET ||
      !/^resumes\/[a-zA-Z0-9-]+\.(pdf|doc|docx)$/i.test(resumeKey)
    ) {
      console.error(
        "Candidate deleted, but resume cleanup needs attention:",
        resumeKey
      );

      return res.status(200).json({
        message: "Candidate deleted successfully",
        warning: "Resume cleanup could not be completed automatically",
      });
    }

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: RESUME_BUCKET,
          Key: resumeKey,
        })
      );
    } catch (error) {
      console.error(
        "Candidate deleted, but S3 resume cleanup failed:",
        error.message
      );

      return res.status(200).json({
        message: "Candidate deleted successfully",
        warning: "Resume cleanup failed; the S3 object may remain",
      });
    }
  }

  return res.status(200).json({
    message: "Candidate and related records deleted successfully",
  });
});


module.exports = router;
