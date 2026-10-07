# TaskBoard API - Windows Production Startup (PowerShell)
# Usage: .\start.ps1

$env:NODE_ENV = "production"
$env:PORT = "3000"
$env:HOST = "0.0.0.0"

# Load .env.production if exists
if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production" -Raw
    $lines = $envContent -split "`r?`n"
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ($line -and !$line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Count -eq 2) {
                $env[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }
}

Write-Host "Starting TaskBoard API on $env:HOST:$env:PORT ..."
Write-Host "Environment: $env:NODE_ENV"
Write-Host "Database: $env:DB_PATH"

node dist/server.js