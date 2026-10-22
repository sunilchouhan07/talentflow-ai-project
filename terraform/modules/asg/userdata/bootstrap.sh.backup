#!/bin/bash

set -euo pipefail

exec > >(tee /var/log/employee-bootstrap.log | logger -t employee-bootstrap -s 2>/dev/console) 2>&1

echo "==============================================="
echo " Employee Application Bootstrap"
echo "==============================================="

APP_DIR="/opt/employee-app"
SCRIPT_DIR="$${APP_DIR}/scripts"
RELEASE_DIR="$${APP_DIR}/releases"

S3_BUCKET="${artifact_bucket_name}"
PROJECT="${Project}"
ENVIRONMENT="${Environment}"
AWS_REGION="${aws_region}"

CURRENT_VERSION_PARAMETER="${current_version_parameter_name}"

# =================================================
# 1. Install system dependencies
# =================================================

echo "[1/9] Installing system dependencies..."

dnf install -y \
    unzip \
    python3 \
    git

echo "System dependencies installed."


# =================================================
# 2. Install Node.js
# =================================================

echo "[2/9] Installing Node.js..."

if ! command -v node >/dev/null 2>&1; then

    echo "Installing Node.js 20..."

    curl -fsSL \
        https://rpm.nodesource.com/setup_20.x \
        | bash -

    dnf install -y nodejs

else

    echo "Node.js already installed."

fi

echo "Node version:"
node --version

echo "NPM version:"
npm --version


# =================================================
# 3. Verify AWS CLI and SSM Agent
# =================================================

echo "[3/9] Checking AWS CLI..."

aws --version

echo "Checking SSM Agent..."

if ! systemctl list-unit-files | grep -q "^amazon-ssm-agent.service"; then

    echo "SSM Agent not installed. Installing..."

    dnf install -y \
        "https://s3.$${AWS_REGION}.amazonaws.com/amazon-ssm-$${AWS_REGION}/latest/linux_amd64/amazon-ssm-agent.rpm"
fi

echo "Enabling SSM Agent..."

systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

echo "SSM Agent status:"
systemctl status amazon-ssm-agent --no-pager

# =================================================
# 3A. Install and Configure CloudWatch Agent
# =================================================

echo "==============================================="
echo " Installing CloudWatch Agent"
echo "==============================================="

echo "Checking CloudWatch Agent..."

if ! command -v amazon-cloudwatch-agent-ctl >/dev/null 2>&1; then

    echo "CloudWatch Agent not installed."
    echo "Installing CloudWatch Agent..."

    dnf install -y amazon-cloudwatch-agent

else

    echo "CloudWatch Agent already installed."

fi

echo "CloudWatch Agent version:"

if [ -f /opt/aws/amazon-cloudwatch-agent/bin/CWAGENT_VERSION ]; then
    cat /opt/aws/amazon-cloudwatch-agent/bin/CWAGENT_VERSION
fi


echo "Fetching CloudWatch Agent configuration from SSM Parameter Store..."

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c ssm:${cloudwatch_agent_parameter_name} \
    -s


echo "Checking CloudWatch Agent status..."

systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

systemctl status amazon-cloudwatch-agent --no-pager || true

echo "CloudWatch Agent configuration completed."




# =================================================
# 4. Wait for ssm-user
# =================================================

echo "[4/9] Creating application user..."

if ! id employee >/dev/null 2>&1; then
    useradd \
        --system \
        --create-home \
        --shell /sbin/nologin \
        employee
    echo "Created employee user."
else
    echo "employee user already exists."
fi


# =================================================
# 5. Create application directories
# =================================================

echo "[5/9] Creating application directories..."

mkdir -p "$${APP_DIR}"
mkdir -p "$${SCRIPT_DIR}"
mkdir -p "$${RELEASE_DIR}"

chown -R employee:employee "$${APP_DIR}"


# =================================================
# 6. Create deployment script
# =================================================

echo "[6/9] Installing deployment script..."

cat > "$${SCRIPT_DIR}/deploy.sh" <<'DEPLOY_SCRIPT'
${deploy_script}
DEPLOY_SCRIPT

chmod 750 "$${SCRIPT_DIR}/deploy.sh"

chown employee:employee "$${SCRIPT_DIR}/deploy.sh"


# =================================================
# 7. Create systemd service
# =================================================

echo "[7/9] Creating systemd service..."

mkdir -p /var/log/employee-backend
touch /var/log/employee-backend/app.log
touch /var/log/employee-backend/error.log
chown -R employee:employee /var/log/employee-backend
chmod 750 /var/log/employee-backend

cat > /etc/systemd/system/employee-backend.service <<'EOF'
[Unit]
Description=Employee Management Backend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple

User=employee
Group=employee

WorkingDirectory=/opt/employee-app/current

ExecStart=/usr/bin/node server.js

Restart=always
RestartSec=5

StandardOutput=append:/var/log/employee-backend/app.log
StandardError=append:/var/log/employee-backend/error.log

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF


systemctl daemon-reload

systemctl enable employee-backend


# =================================================
# 8. Get current application version
# =================================================

echo "[8/9] Getting current application version..."

CURRENT_VERSION=$(aws ssm get-parameter \
    --name "$${CURRENT_VERSION_PARAMETER}" \
    --query 'Parameter.Value' \
    --output text \
    --region "$${AWS_REGION}")


if [ -z "$${CURRENT_VERSION}" ] || [ "$${CURRENT_VERSION}" = "None" ]; then

    echo "ERROR: Current application version not found."

    exit 1

fi


echo "Current version: $${CURRENT_VERSION}"


# =================================================
# 9. Deploy application
# =================================================

ARTIFACT="employee-backend-$${CURRENT_VERSION}.zip"

echo "Artifact: $${ARTIFACT}"

echo "Starting deployment..."

"$${SCRIPT_DIR}/deploy.sh" \
    "$${PROJECT}" \
    "$${ARTIFACT}" \
    "$${CURRENT_VERSION}" \
    "$${S3_BUCKET}" \
    "$${ENVIRONMENT}" \
    "$${AWS_REGION}" 

echo ""
echo "==============================================="
echo " BOOTSTRAP COMPLETED SUCCESSFULLY"
echo "==============================================="

echo "Application status:"

systemctl status employee-backend --no-pager || true