@echo off
REM TaskBoard API - Windows Production Startup
REM Usage: start.bat

set NODE_ENV=production
set PORT=3000
set HOST=0.0.0.0

REM Load .env.production if exists
if exist .env.production (
    for /f "usebackq delims=" %%A in (.env.production) do set %%A
)

echo Starting TaskBoard API on %HOST%:%PORT% ...
echo Environment: %NODE_ENV%
echo Database: %DB_PATH%

node dist/server.js