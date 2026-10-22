#!/bin/bash

set -euo pipefail

APP_NAME="talentflow-AI"

PROJECT="$1"
ARTIFACT="$2"
VERSION="$3"
S3_BUCKET="$4"
ENVIRONMENT="$5"
AWS_REGION="$6"



BASE_DIR="/opt/talentflow-ai"
RELEASE_DIR="${BASE_DIR}/releases/${VERSION}"
CURRENT_LINK="${BASE_DIR}/current"

APP_PORT="5000"

# Detect whether script is running as root
if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
else
    SUDO="sudo"
fi

echo "==============================================="
echo " talentflow-AI Backend Deployment"
echo "==============================================="
echo "Artifact : ${ARTIFACT}"
echo "Version  : ${VERSION}"
echo "==============================================="


# =================================================
# 1. Download artifact
# =================================================

echo "[1/9] Downloading artifact from S3..."

aws s3 cp \
    "s3://${S3_BUCKET}/backend/${ARTIFACT}" \
    "/tmp/${ARTIFACT}" \
    --region "${AWS_REGION}"

test -f "/tmp/${ARTIFACT}"

echo "Artifact downloaded."


# =================================================
# 2. Prepare release directory
# =================================================

echo "[2/9] Preparing release directory..."

mkdir -p "${RELEASE_DIR}"

rm -rf "${RELEASE_DIR:?}"/*


# =================================================
# 3. Extract application
# =================================================

echo "[3/9] Extracting application..."

unzip -o \
    "/tmp/${ARTIFACT}" \
    -d "${RELEASE_DIR}"


# =================================================
# Ensure RDS CA bundle is available
# =================================================

echo "Ensuring RDS CA bundle is available..."

RDS_CA_DIR="/etc/pki/tls/certs"
RDS_CA_FILE="${RDS_CA_DIR}/rds-global-bundle.pem"

${SUDO} mkdir -p "${RDS_CA_DIR}"

if [ ! -s "${RDS_CA_FILE}" ]; then
    ${SUDO} curl -fSL \
        https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
        -o "${RDS_CA_FILE}.tmp"

    ${SUDO} test -s "${RDS_CA_FILE}.tmp"

    ${SUDO} mv \
        "${RDS_CA_FILE}.tmp" \
        "${RDS_CA_FILE}"

    ${SUDO} chmod 644 "${RDS_CA_FILE}"
fi

echo "RDS CA bundle is available."

# =================================================
# 4. Install Node dependencies
# =================================================

echo "[4/9] Installing dependencies..."

cd "${RELEASE_DIR}"

npm ci --omit=dev


# =================================================
# 5. Read database configuration from SSM
# =================================================

echo "[5/9] Reading database configuration..."

DB_SECRET_ARN=$(aws ssm get-parameter \
    --name "/app/${PROJECT}-${ENVIRONMENT}/db/secret-arn" \
    --query 'Parameter.Value' \
    --output text \
    --region "${AWS_REGION}")

DB_HOST=$(aws ssm get-parameter \
    --name "/app/${PROJECT}-${ENVIRONMENT}/db/host" \
    --query 'Parameter.Value' \
    --output text \
    --region "${AWS_REGION}")

DB_PORT=$(aws ssm get-parameter \
    --name "/app/${PROJECT}-${ENVIRONMENT}/db/port" \
    --query 'Parameter.Value' \
    --output text \
    --region "${AWS_REGION}")

DB_NAME=$(aws ssm get-parameter \
    --name "/app/${PROJECT}-${ENVIRONMENT}/db/name" \
    --query 'Parameter.Value' \
    --output text \
    --region "${AWS_REGION}")


# =================================================
# 6. Get credentials from Secrets Manager
# =================================================

echo "[6/9] Fetching database credentials..."

SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "${DB_SECRET_ARN}" \
    --query 'SecretString' \
    --output text \
    --region "${AWS_REGION}")

DB_USER=$(printf '%s' "${SECRET_JSON}" | \
    python3 -c 'import json,sys; print(json.load(sys.stdin)["username"])')

DB_PASSWORD=$(printf '%s' "${SECRET_JSON}" | \
    python3 -c 'import json,sys; print(json.load(sys.stdin)["password"])')




# =================================================
# 7. Create runtime environment
# =================================================

echo "[7/9] Fetching application configuration..."

APP_SECRET_ARN=$(aws ssm get-parameter \
    --name "/app/${PROJECT}-${ENVIRONMENT}/app/secret-arn" \
    --query 'Parameter.Value' \
    --output text \
    --region "${AWS_REGION}")

RESUME_BUCKET=$(aws ssm get-parameter \
    --name "/app/${PROJECT}-${ENVIRONMENT}/s3/resume-bucket" \
    --query 'Parameter.Value' \
    --output text \
    --region "${AWS_REGION}")

echo "Fetching application secrets from Secrets Manager..."

APP_SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "${APP_SECRET_ARN}" \
    --query 'SecretString' \
    --output text \
    --region "${AWS_REGION}")

JWT_SECRET=$(printf '%s' "${APP_SECRET_JSON}" | \
    python3 -c 'import json,sys; print(json.load(sys.stdin)["jwt_secret"])')

GROQ_API_KEY=$(printf '%s' "${APP_SECRET_JSON}" | \
    python3 -c 'import json,sys; print(json.load(sys.stdin)["groq_api_key"])')

# Validate required values without printing their contents.
test -n "${DB_HOST}"
test -n "${DB_NAME}"
test -n "${DB_USER}"
test -n "${DB_PASSWORD}"
test -n "${JWT_SECRET}"
test -n "${GROQ_API_KEY}"
test -n "${RESUME_BUCKET}"

echo "Writing production environment file..."

umask 077
cat > "${RELEASE_DIR}/.env" <<EOF
NODE_ENV=production
PORT=${APP_PORT}
AWS_REGION=${AWS_REGION}
RESUME_BUCKET=${RESUME_BUCKET}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_SSL=true
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
GROQ_API_KEY=${GROQ_API_KEY}
EOF

chown talentflow:talentflow "${RELEASE_DIR}/.env"
chmod 600 "${RELEASE_DIR}/.env"

unset SECRET_JSON DB_PASSWORD
unset APP_SECRET_JSON JWT_SECRET GROQ_API_KEY
unset DB_USER

# =================================================
# 8. Validate + switch release
# =================================================

echo "[8/9] Validating application..."

test -f "${RELEASE_DIR}/src/server.js"
test -f "${RELEASE_DIR}/package.json"
test -f "${RELEASE_DIR}/package-lock.json"
test -f "${RELEASE_DIR}/.env"




# =================================================
# 9. Initialize database schema
# =================================================

echo "Initializing database schema..."

cd "${RELEASE_DIR}"

sudo -u talentflow /usr/bin/node - <<'NODE'
const fs = require("fs");
const path = require("path");
require("dotenv").config({
  path: path.join(process.cwd(), ".env")
});

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true"
    ? {
        ca: fs.readFileSync(
          "/etc/pki/tls/certs/rds-global-bundle.pem",
          "utf8"
        ),
        rejectUnauthorized: true,
      }
    : false,
});

(async () => {
  try {
    const schemaPath = path.join(
      process.cwd(),
      "src/db/schema.sql"
    );

    const schema = fs.readFileSync(schemaPath, "utf8");

    await pool.query("BEGIN");

    try {
      await pool.query(schema);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }

    console.log("Database schema initialized successfully.");
  } catch (error) {
    console.error("Database schema initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
NODE

echo "Database schema initialization completed."


echo "Changing current release..."

ln -sfn \
    "${RELEASE_DIR}" \
    "${CURRENT_LINK}"


echo "Fixing ownership..."

chown -R talentflow:talentflow "${RELEASE_DIR}"


echo "Restarting application..."

${SUDO} systemctl daemon-reload

${SUDO} systemctl enable talentflow-backend

${SUDO} systemctl restart talentflow-backend


echo "Waiting for application..."

sleep 5


# =================================================
# Health check
# =================================================

if curl -fsS \
    "http://localhost:${APP_PORT}/api/health" \
    -o /tmp/talentflow-health.json
then

    echo ""
    echo "==============================================="
    echo " DEPLOYMENT SUCCESS"
    echo "==============================================="

    cat /tmp/talentflow-health.json

    echo ""
    echo "Version: ${VERSION}"
    echo "Release: ${RELEASE_DIR}"

else

    echo ""
    echo "==============================================="
    echo " DEPLOYMENT FAILED"
    echo "==============================================="

    ${SUDO} systemctl status talentflow-backend --no-pager || true

    ${SUDO} journalctl \
        -u talentflow-backend \
        -n 50 \
        --no-pager || true

    exit 1

fi