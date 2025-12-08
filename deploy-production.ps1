# Production Deployment Script for Windows
# AI Prompt Templates Application

param(
    [switch]$SkipBackup,
    [switch]$SkipInstall,
    [switch]$SkipMigrations,
    [switch]$UseGit,
    [switch]$NoPm2,
    [string]$AppDir = $PSScriptRoot,
    [string]$BackupDir = "$PSScriptRoot\backups",
    [switch]$Rollback,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Configuration
$AppName = "ai-prompt-templates"
$DbName = "prompts.db"
$LogFile = "$AppDir\deployment.log"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan | Tee-Object -FilePath $LogFile -Append
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green | Tee-Object -FilePath $LogFile -Append
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow | Tee-Object -FilePath $LogFile -Append
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red | Tee-Object -FilePath $LogFile -Append
}

function Check-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Node.js
    try {
        $nodeVersion = node -v
        Write-Success "Node.js $nodeVersion found"
        
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -lt 14) {
            Write-Error "Node.js version 14+ is required. Current version: $nodeVersion"
            exit 1
        }
    } catch {
        Write-Error "Node.js is not installed. Please install Node.js 14+ first."
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm -v
        Write-Success "npm $npmVersion found"
    } catch {
        Write-Error "npm is not installed."
        exit 1
    }
    
    # Check PM2 (optional)
    if (-not $NoPm2) {
        try {
            pm2 -v | Out-Null
            Write-Success "PM2 found"
        } catch {
            Write-Warning "PM2 is not installed. Installing PM2 globally..."
            npm install -g pm2
        }
    }
    
    # Check if .env exists
    if (-not (Test-Path "$AppDir\.env")) {
        Write-Warning ".env file not found. Make sure to create it from .env.example"
    } else {
        Write-Success ".env file found"
    }
    
    # Check if we're in the right directory
    if (-not (Test-Path "$AppDir\package.json")) {
        Write-Error "package.json not found in $AppDir"
        Write-Error "Please run this script from the application root directory"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Backup-Database {
    if ($SkipBackup) {
        Write-Warning "Skipping database backup"
        return
    }
    
    Write-Info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }
    
    $dbPath = "$AppDir\$DbName"
    if (-not (Test-Path $dbPath)) {
        Write-Warning "Database file $DbName not found. Skipping backup."
        return
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$BackupDir\${DbName}.backup_${timestamp}"
    
    Copy-Item $dbPath $backupFile
    
    Write-Success "Database backed up to $backupFile"
    
    # Keep only last 10 backups
    Get-ChildItem "$BackupDir\${DbName}.backup_*" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -Skip 10 | 
        Remove-Item -Force
}

function Stop-Application {
    if (-not $NoPm2) {
        Write-Info "Stopping application with PM2..."
        
        $pm2List = pm2 list 2>$null
        if ($pm2List -match $AppName) {
            pm2 stop $AppName 2>$null
            pm2 delete $AppName 2>$null
            Write-Success "Application stopped"
        } else {
            Write-Warning "Application not running in PM2"
        }
    } else {
        Write-Info "Checking for running Node.js processes..."
        Get-Process -Name node -ErrorAction SilentlyContinue | 
            Where-Object { $_.CommandLine -like "*server.js*" } | 
            Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Warning "Attempted to stop Node.js processes. Please verify manually."
    }
}

function Pull-LatestChanges {
    if ($UseGit) {
        Write-Info "Pulling latest changes from git..."
        
        if (-not (Test-Path "$AppDir\.git")) {
            Write-Warning "Not a git repository. Skipping git pull."
            return
        }
        
        Push-Location $AppDir
        try {
            $status = git status --porcelain
            if ($status) {
                Write-Warning "You have uncommitted changes. Consider stashing or committing them."
                $response = Read-Host "Continue anyway? (y/N)"
                if ($response -ne "y" -and $response -ne "Y") {
                    Write-Error "Deployment cancelled"
                    exit 1
                }
            }
            
            git pull origin main 2>$null
            if ($LASTEXITCODE -ne 0) {
                git pull origin master 2>$null
            }
            
            Write-Success "Latest changes pulled"
        } catch {
            Write-Warning "Git pull failed. Continuing with current files..."
        } finally {
            Pop-Location
        }
    } else {
        Write-Info "Git pull skipped (UseGit=false)"
    }
}

function Install-Dependencies {
    if ($SkipInstall) {
        Write-Warning "Skipping dependency installation"
        return
    }
    
    Write-Info "Installing dependencies..."
    
    Push-Location $AppDir
    try {
        npm ci --production
        if ($LASTEXITCODE -ne 0) {
            npm install --production
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to install dependencies"
                exit 1
            }
        }
        Write-Success "Dependencies installed"
    } finally {
        Pop-Location
    }
}

function Run-Migrations {
    if ($SkipMigrations) {
        Write-Warning "Skipping migrations"
        return
    }
    
    Write-Info "Checking for database migrations..."
    
    $migrationFiles = Get-ChildItem -Path $AppDir -Filter "migrate-*.js" -Recurse | Sort-Object Name
    
    if (-not $migrationFiles) {
        Write-Info "No migration files found"
        return
    }
    
    Write-Info "Found migration files. Review and run them manually if needed:"
    foreach ($file in $migrationFiles) {
        Write-Info "  - $($file.Name)"
    }
}

function Start-Application {
    Write-Info "Starting application..."
    
    Push-Location $AppDir
    try {
        if (-not $NoPm2) {
            pm2 start server.js --name $AppName --update-env
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to start application with PM2"
                exit 1
            }
            
            pm2 save 2>$null
            
            Write-Success "Application started with PM2"
            
            Start-Sleep -Seconds 2
            pm2 status
        } else {
            Write-Warning "Starting application in background (not using PM2)"
            $job = Start-Job -ScriptBlock {
                Set-Location $using:AppDir
                node server.js > "$using:AppDir\app.log" 2>&1
            }
            Write-Success "Application started (Job ID: $($job.Id))"
        }
    } finally {
        Pop-Location
    }
}

function Verify-Deployment {
    Write-Info "Verifying deployment..."
    
    Start-Sleep -Seconds 3
    
    if (-not $NoPm2) {
        $pm2Status = pm2 list 2>$null
        if ($pm2Status -match "$AppName.*online") {
            Write-Success "Application is running"
        } else {
            Write-Error "Application is not running"
            pm2 logs $AppName --lines 20
            exit 1
        }
    }
    
    # Try to check health endpoint if available
    $port = "3000"
    if (Test-Path "$AppDir\.env") {
        $envContent = Get-Content "$AppDir\.env"
        $portLine = $envContent | Select-String "^PORT="
        if ($portLine) {
            $port = ($portLine -split '=')[1].Trim()
        }
    }
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:${port}/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Health check passed"
    } catch {
        Write-Warning "Health check failed (this might be normal if endpoint doesn't exist)"
    }
}

function Show-Summary {
    Write-Success "================================================"
    Write-Success "Deployment completed successfully!"
    Write-Success "================================================"
    Write-Host ""
    Write-Host "Application Name: $AppName"
    Write-Host "Directory: $AppDir"
    Write-Host "Deployment Time: $(Get-Date)"
    Write-Host ""
    
    if (-not $NoPm2) {
        Write-Host "Useful commands:"
        Write-Host "  pm2 status              - Check application status"
        Write-Host "  pm2 logs $AppName      - View application logs"
        Write-Host "  pm2 monit               - Monitor application"
        Write-Host "  pm2 restart $AppName   - Restart application"
        Write-Host "  pm2 stop $AppName      - Stop application"
    }
    
    Write-Host ""
    Write-Host "Database backup location: $BackupDir"
    Write-Host "Deployment log: $LogFile"
    Write-Host ""
    Write-Info "Remember to verify the application is working correctly!"
}

function Rollback {
    Write-Warning "Rolling back deployment..."
    
    Stop-Application
    
    $backups = Get-ChildItem "$BackupDir\${DbName}.backup_*" | Sort-Object LastWriteTime -Descending
    if ($backups) {
        $latestBackup = $backups[0]
        Write-Info "Restoring database from $($latestBackup.Name)"
        Copy-Item $latestBackup.FullName "$AppDir\$DbName" -Force
        Write-Success "Database restored"
    }
    
    Start-Application
    
    Write-Success "Rollback completed"
}

# Show help
if ($Help) {
    Write-Host "Usage: .\deploy-production.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -SkipBackup          Skip database backup"
    Write-Host "  -SkipInstall         Skip npm install"
    Write-Host "  -SkipMigrations      Skip running migrations"
    Write-Host "  -UseGit              Pull latest changes from git"
    Write-Host "  -NoPm2               Don't use PM2 (use background job instead)"
    Write-Host "  -AppDir <DIR>        Application directory (default: script directory)"
    Write-Host "  -BackupDir <DIR>     Backup directory (default: .\backups)"
    Write-Host "  -Rollback            Rollback to previous version"
    Write-Host "  -Help                Show this help message"
    exit 0
}

# Rollback mode
if ($Rollback) {
    Rollback
    exit 0
}

# Main deployment flow
Write-Info "================================================"
Write-Info "Starting Production Deployment"
Write-Info "================================================"
Write-Info "Application: $AppName"
Write-Info "Directory: $AppDir"
Write-Info "Timestamp: $(Get-Date)"
Write-Info "================================================"
Write-Host ""

Check-Prerequisites
Backup-Database
Stop-Application
Pull-LatestChanges
Install-Dependencies
Run-Migrations
Start-Application
Verify-Deployment
Show-Summary

Write-Success "Deployment completed successfully!"

