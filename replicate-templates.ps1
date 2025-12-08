# PowerShell wrapper for replicate-templates.js
# Usage: .\replicate-templates.ps1 [--dry-run] [--production-host=HOST] ...

param(
    [switch]$DryRun,
    [string]$ProductionHost,
    [string]$ProductionPort,
    [string]$ProductionDatabase,
    [string]$ProductionUser,
    [string]$ProductionPassword,
    [switch]$SkipBackup,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Template Replication Script - PowerShell Wrapper

Usage: .\replicate-templates.ps1 [options]

Options:
  -DryRun                  Show what would be done without making changes
  -SkipBackup              Skip creating backup table
  -ProductionHost HOST     Production database host
  -ProductionPort PORT     Production database port
  -ProductionDatabase DB   Production database name
  -ProductionUser USER     Production database user
  -ProductionPassword PASS Production database password
  -Help                    Show this help message

Examples:
  .\replicate-templates.ps1 -DryRun
  .\replicate-templates.ps1 -ProductionHost prod-server.com
"@
    exit 0
}

$arguments = @()

if ($DryRun) {
    $arguments += "--dry-run"
}

if ($SkipBackup) {
    $arguments += "--skip-backup"
}

if ($ProductionHost) {
    $arguments += "--production-host=$ProductionHost"
}

if ($ProductionPort) {
    $arguments += "--production-port=$ProductionPort"
}

if ($ProductionDatabase) {
    $arguments += "--production-database=$ProductionDatabase"
}

if ($ProductionUser) {
    $arguments += "--production-user=$ProductionUser"
}

if ($ProductionPassword) {
    $arguments += "--production-password=$ProductionPassword"
}

Write-Host "Running template replication script..." -ForegroundColor Cyan
node replicate-templates.js $arguments

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nScript failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

