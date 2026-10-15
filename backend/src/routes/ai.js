
const express = require("express");
const Groq = require("groq-sdk");
const pool = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/insights",
  authenticateToken,
  requireRole("admin", "recruiter", "hiring_manager"),
  async (req, res) => {
      try {
    // 1. Validate API configuration
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: "AI service is not configured. Check GROQ_API_KEY."
      });
    }

    // 2. Fetch aggregate recruitment statistics
    const [
      candidatesResult,
      jobsResult,
      applicationsResult,
      interviewsResult
    ] = await Promise.all([
      // Candidates
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(ROUND(AVG(match_score)), 0) AS average_match_score
        FROM candidates
      `),

      // Jobs
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM jobs
      `),

      // Applications
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(stage, '')) = 'shortlisted'
          )::int AS shortlisted,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(stage, '')) = 'hired'
          )::int AS hired
        FROM applications
      `),

      // Interviews
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, '')) = 'scheduled'
          )::int AS scheduled,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, '')) = 'completed'
          )::int AS completed
        FROM interviews
      `)
    ]);

    const stats = {
      candidates: candidatesResult.rows[0],
      jobs: jobsResult.rows[0],
      applications: applicationsResult.rows[0],
      interviews: interviewsResult.rows[0]
    };

    // 3. Initialize Groq
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    // 4. Generate AI insights
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: `
You are a recruitment analytics assistant for TalentFlow-AI.

Analyze only the supplied aggregate PostgreSQL statistics.

Provide:
1. A concise summary of the current recruitment pipeline.
2. Two or three useful observations based on the actual numbers.
3. Practical recommendations for improving the recruitment workflow.

Do not invent facts, assume missing details, or make unsupported claims.
If a count is zero, report it accurately.
Clearly distinguish observations from recommendations.
Do not make hiring decisions about individual candidates.
Use clear, professional language and concise bullet points.
          `.trim()
        },
        {
          role: "user",
          content: `Analyze these recruitment statistics:\n${JSON.stringify(
            stats,
            null,
            2
          )}`
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 500
    });

    const insight = completion.choices[0]?.message?.content?.trim();

    if (!insight) {
      return res.status(502).json({
        error: "AI returned an empty response. Please try again."
      });
    }

    // 5. Return statistics and generated insights
    return res.status(200).json({
      success: true,
      stats,
      insight
    });

  } catch (error) {
  console.error("AI insights error:", error);

  return res.status(500).json({
    error: error.message || "Unknown server error"
  });
}
});

module.exports = router;
