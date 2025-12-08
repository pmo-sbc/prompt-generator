# Database Replication Script for Windows
# PowerShell wrapper for replicate-database.js

param(
    [string]$ProductionEnvFile = ".env.production",
    [string]$ProductionHost,
    [int]$ProductionPort,
    [string]$ProductionDatabase,
    [string]$ProductionUser,
    [string]$ProductionPassword,
    [switch]$ProductionSsl,
    [switch]$SkipBackup,
    [switch]$DryRun,
    [string]$Tables,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Show help
if ($Help) {
    Write-Host @"
Database Replication Script
===========================

Usage:
  .\replicate-database.ps1 [OPTIONS]

Options:
  -ProductionEnvFile <file>     Path to production .env file (default: .env.production)
  -ProductionHost <host>        Production database host
  -ProductionPort <port>        Production database port
  -ProductionDatabase <name>    Production database name
  -ProductionUser <user>        Production database user
  -ProductionPassword <pass>    Production database password
  -ProductionSsl                Use SSL for production connection
  -SkipBackup                   Skip creating backup of production database
  -DryRun                       Show what would be done without actually doing it
  -Tables <list>                Comma-separated list of tables to replicate
  -Help                         Show this help message

Examples:
  # Use .env.production file
  .\replicate-database.ps1

  # Use command-line arguments
  .\replicate-database.ps1 `
    -ProductionHost "production.example.com" `
    -ProductionDatabase "my_database" `
    -ProductionUser "my_user" `
    -ProductionPassword "my_password" `
    -ProductionSsl

  # Dry run to see what would happen
  .\replicate-database.ps1 -DryRun

  # Only replicate specific tables
  .\replicate-database.ps1 -Tables "users,products,orders"
"@
    exit 0
}

# Check if Node.js is available
try {
    $nodeVersion = node -v
    Write-Host "[INFO] Node.js $nodeVersion found" -ForegroundColor Cyan
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js and try again." -ForegroundColor Yellow
    exit 1
}

# Check if replicate-database.js exists
if (-not (Test-Path "replicate-database.js")) {
    Write-Host "[ERROR] replicate-database.js not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Build command arguments
$args = @()

if ($ProductionEnvFile -and (Test-Path $ProductionEnvFile)) {
    $args += "--production-env"
    $args += $ProductionEnvFile
}

if ($ProductionHost) {
    $args += "--production-host"
    $args += $ProductionHost
}

if ($ProductionPort) {
    $args += "--production-port"
    $args += $ProductionPort.ToString()
}

if ($ProductionDatabase) {
    $args += "--production-db"
    $args += $ProductionDatabase
}

if ($ProductionUser) {
    $args += "--production-user"
    $args += $ProductionUser
}

if ($ProductionPassword) {
    $args += "--production-password"
    $args += $ProductionPassword
}

if ($ProductionSsl) {
    $args += "--production-ssl"
    $args += "true"
}

if ($SkipBackup) {
    $args += "--skip-backup"
}

if ($DryRun) {
    $args += "--dry-run"
}

if ($Tables) {
    $args += "--tables"
    $args += $Tables
}

# Run the Node.js script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Database Replication" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    node replicate-database.js $args
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Replication script completed successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERROR] Replication script failed with exit code $exitCode" -ForegroundColor Red
        exit $exitCode
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to execute replication script: $_" -ForegroundColor Red
    exit 1
}

