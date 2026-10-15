
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// POST /api/auth/register
// Public registration can create recruiters only.
router.post("/register", async (req, res) => {
  const { full_name, email, password } = req.body || {};

  if (
    typeof full_name !== "string" ||
    !full_name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return res.status(400).json({
      error: "Name, valid email, and password of at least 8 characters are required",
    });
  }

  if (full_name.trim().length > 120 || email.trim().length > 255) {
    return res.status(400).json({
      error: "Name or email is too long",
    });
  }

  try {
    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO public.users (full_name, email, password_hash, role)
       VALUES ($1, LOWER(TRIM($2)), $3, 'recruiter')
       RETURNING id, full_name, email, role, created_at`,
      [full_name.trim(), email, password_hash]
    );

    return res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      error: "Failed to create account",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    return res.status(500).json({
      error: "Authentication is not configured",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role
       FROM public.users
       WHERE email = LOWER(TRIM($1))
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: "talentflow-api",
        audience: "talentflow-client",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      error: "Failed to log in",
    });
  }
});

module.exports = router;
