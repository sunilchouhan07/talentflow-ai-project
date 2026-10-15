
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      error: "Authentication token is missing",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not configured");

    return res.status(500).json({
      error: "Authentication is not configured",
    });
  }

  try {
    const payload = jwt.verify(token, secret, {
      issuer: "talentflow-api",
      audience: "talentflow-client",
    });

    if (
      typeof payload.sub !== "string" ||
      !["admin", "recruiter", "hiring_manager"].includes(payload.role)
    ) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired authentication token",
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
};
