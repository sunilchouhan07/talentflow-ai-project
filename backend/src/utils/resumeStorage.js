
const {
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const pool = require("../config/db");
const { extractResumeText } = require("./resumeParser");

const RESUME_BUCKET = process.env.RESUME_BUCKET;
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

const s3 = new S3Client({
  region: AWS_REGION,
});

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function getCandidateResumeText(candidateId) {
  if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
    throw new Error("Invalid candidate ID.");
  }

  if (!RESUME_BUCKET) {
    throw new Error("Resume storage is not configured.");
  }

  const result = await pool.query(
    `SELECT resume_url
     FROM public.candidates
     WHERE id = $1`,
    [candidateId]
  );

  if (result.rowCount === 0) {
    throw new Error("Candidate not found.");
  }

  const resumeKey = result.rows[0].resume_url;

  if (!resumeKey) {
    throw new Error("Candidate has no uploaded resume.");
  }

  // Only permit the private resume key format used by the upload route.
  if (
    !/^resumes\/[a-zA-Z0-9-]+\.(pdf|docx)$/i.test(resumeKey)
  ) {
    throw new Error(
      "Resume format is not supported for AI extraction."
    );
  }

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: RESUME_BUCKET,
      Key: resumeKey,
    })
  );

  if (!response.Body) {
    throw new Error("The stored resume is empty.");
  }

  const buffer = await streamToBuffer(response.Body);
  const filename = resumeKey.split("/").pop();

  return extractResumeText(buffer, filename);
}

module.exports = { getCandidateResumeText };
