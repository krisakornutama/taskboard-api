# TaskBoard API - Deployment Guide

## Quick Start

### Docker (Recommended)
```bash
# Build and run
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Windows
```cmd
# Double-click or run in terminal
start.bat
```
Or PowerShell:
```powershell
.\start.ps1
```

### Linux (systemd)
```bash
# As root
sudo bash install.sh
```

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `development` | No | `production` enables strict checks |
| `PORT` | `3000` | No | HTTP port |
| `HOST` | `0.0.0.0` | No | Bind address |
| `DB_PATH` | `./data/taskboard.sqlite` | No | SQLite file path |
| `CORS_ORIGIN` | `*` | No | CORS allowed origins (comma-separated) |
| `JWT_SECRET` | random/boot | **Yes (prod)** | JWT signing secret (>=32 chars) |
| `ACCESS_TOKEN_TTL` | `15m` | No | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | No | Refresh token lifetime |
| `LOGIN_RATE_LIMIT_MAX` | `5` | No | Login attempts per window |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` | No | Rate limit window (ms) |
| `SEED_ADMIN_EMAIL` | — | No | Bootstrap admin email |
| `SEED_ADMIN_PASSWORD` | — | No | Bootstrap admin password |
| `SEED_ADMIN_NAME` | `Platform Admin` | No | Bootstrap admin name |

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (48+ bytes hex)
- [ ] Set `CORS_ORIGIN` to your frontend domain
- [ ] Configure `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
- [ ] Use reverse proxy (Nginx/Caddy) for TLS
- [ ] Set up backups for SQLite file (`DB_PATH`)
- [ ] Configure log rotation
- [ ] Set up monitoring/health checks

---

## Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Liveness + DB connectivity |
| `GET /api/health` | Same under API prefix |

Expected response:
```json
{
  "status": "ok",
  "uptimeSeconds": 123,
  "environment": "production",
  "version": "1.0.0",
  "timestamp": "2026-10-07T12:00:00.000Z"
}
```

---

## API Documentation

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs/openapi.json`

---

## Backup Strategy

```bash
# Backup SQLite (online, consistent)
sqlite3 data/taskboard.sqlite ".backup backups/taskboard-$(date +%F).sqlite"

# Restore
sqlite3 data/taskboard.sqlite ".restore backups/taskboard-2026-10-07.sqlite"
```

---

## Nginx Reverse Proxy Example

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Files Created

| File | Purpose |
|------|---------|
| `.env.production` | Production environment config |
| `start.bat` | Windows CMD startup |
| `start.ps1` | Windows PowerShell startup |
| `Dockerfile` | Container image |
| `docker-compose.yml` | Multi-container orchestration |
| `.dockerignore` | Docker build exclusions |
| `taskboard-api.service` | systemd service unit |
| `install.sh` | Linux automated installer |
| `DEPLOY.md` | This file |