#!/bin/bash
# TaskBoard API - Linux Installation Script
# Run as root: sudo bash install.sh

set -euo pipefail

APP_NAME="taskboard-api"
APP_USER="taskboard"
APP_DIR="/opt/${APP_NAME}"
SERVICE_FILE="${APP_NAME}.service"

echo "=== TaskBoard API Installation ==="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Create user
if ! id "${APP_USER}" &>/dev/null; then
    useradd -r -s /bin/false -d "${APP_DIR}" "${APP_USER}"
    echo "Created user: ${APP_USER}"
fi

# Create app directory
mkdir -p "${APP_DIR}/data"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# Copy files (assumes running from project root)
echo "Copying application files..."
cp -r dist node_modules package.json .env.production "${APP_DIR}/"
cp .env.production "${APP_DIR}/.env"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# Install systemd service
cp "${SERVICE_FILE}" "/etc/systemd/system/"
systemctl daemon-reload

# Enable and start
systemctl enable "${APP_NAME}"
systemctl start "${APP_NAME}"

echo ""
echo "=== Installation Complete ==="
echo "Service status: systemctl status ${APP_NAME}"
echo "Logs: journalctl -u ${APP_NAME} -f"
echo "API: http://localhost:3000/health"