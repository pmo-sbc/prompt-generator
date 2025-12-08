#!/bin/bash

###############################################################################
# Production Deployment Script
# AI Prompt Templates Application
###############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ai-prompt-templates"
APP_DIR="${APP_DIR:-$(pwd)}"
DB_NAME="prompts.db"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
LOG_FILE="${LOG_FILE:-$APP_DIR/deployment.log}"
USE_PM2=true
USE_GIT=false
SKIP_BACKUP=false
SKIP_INSTALL=false
SKIP_MIGRATIONS=false

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 14+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        log_error "Node.js version 14+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    log_success "Node.js $(node -v) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    log_success "npm $(npm -v) found"
    
    # Check PM2 (optional)
    if [ "$USE_PM2" = true ]; then
        if ! command -v pm2 &> /dev/null; then
            log_warning "PM2 is not installed. Installing PM2 globally..."
            npm install -g pm2
        fi
        log_success "PM2 found"
    fi
    
    # Check if .env exists
    if [ ! -f "$APP_DIR/.env" ]; then
        log_warning ".env file not found. Make sure to create it from .env.example"
        log_warning "Continuing deployment, but application may not start without .env"
    else
        log_success ".env file found"
    fi
    
    # Check if we're in the right directory
    if [ ! -f "$APP_DIR/package.json" ]; then
        log_error "package.json not found in $APP_DIR"
        log_error "Please run this script from the application root directory"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

backup_database() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Skipping database backup"
        return 0
    fi
    
    log_info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    if [ ! -f "$APP_DIR/$DB_NAME" ]; then
        log_warning "Database file $DB_NAME not found. Skipping backup."
        return 0
    fi
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}.backup_${TIMESTAMP}"
    
    cp "$APP_DIR/$DB_NAME" "$BACKUP_FILE"
    
    # Compress backup
    if command -v gzip &> /dev/null; then
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        log_success "Database backed up to $BACKUP_FILE"
    else
        log_success "Database backed up to $BACKUP_FILE"
    fi
    
    # Keep only last 10 backups
    find "$BACKUP_DIR" -name "${DB_NAME}.backup_*" -type f -mtime +10 -delete 2>/dev/null || true
}

stop_application() {
    if [ "$USE_PM2" = true ]; then
        log_info "Stopping application with PM2..."
        
        if pm2 list | grep -q "$APP_NAME"; then
            pm2 stop "$APP_NAME" || true
            pm2 delete "$APP_NAME" || true
            log_success "Application stopped"
        else
            log_warning "Application not running in PM2"
        fi
    else
        log_info "Checking for running Node.js processes..."
        # Try to find and stop any running server processes
        pkill -f "node.*server.js" || true
        log_warning "Attempted to stop Node.js processes. Please verify manually."
    fi
}

pull_latest_changes() {
    if [ "$USE_GIT" = true ]; then
        log_info "Pulling latest changes from git..."
        
        if [ ! -d "$APP_DIR/.git" ]; then
            log_warning "Not a git repository. Skipping git pull."
            return 0
        fi
        
        # Check if there are uncommitted changes
        if [ -n "$(git status --porcelain)" ]; then
            log_warning "You have uncommitted changes. Consider stashing or committing them."
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_error "Deployment cancelled"
                exit 1
            fi
        fi
        
        git pull origin main || git pull origin master || {
            log_warning "Git pull failed. Continuing with current files..."
        }
        
        log_success "Latest changes pulled"
    else
        log_info "Git pull skipped (USE_GIT=false)"
    fi
}

install_dependencies() {
    if [ "$SKIP_INSTALL" = true ]; then
        log_warning "Skipping dependency installation"
        return 0
    fi
    
    log_info "Installing dependencies..."
    
    cd "$APP_DIR"
    npm ci --production || npm install --production || {
        log_error "Failed to install dependencies"
        exit 1
    }
    
    log_success "Dependencies installed"
}

run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        log_warning "Skipping migrations"
        return 0
    fi
    
    log_info "Checking for database migrations..."
    
    # Find all migration files
    MIGRATION_FILES=$(find "$APP_DIR" -name "migrate-*.js" -type f | sort)
    
    if [ -z "$MIGRATION_FILES" ]; then
        log_info "No migration files found"
        return 0
    fi
    
    log_info "Found migration files. Review and run them manually if needed:"
    echo "$MIGRATION_FILES" | while read -r file; do
        log_info "  - $(basename "$file")"
    done
    
    # Note: Automatically running migrations can be dangerous
    # Uncomment the following to auto-run migrations (use with caution)
    # for migration in $MIGRATION_FILES; do
    #     log_info "Running $(basename "$migration")..."
    #     node "$migration" || {
    #         log_error "Migration $(basename "$migration") failed"
    #         exit 1
    #     }
    # done
}

start_application() {
    log_info "Starting application..."
    
    cd "$APP_DIR"
    
    if [ "$USE_PM2" = true ]; then
        # Start with PM2
        pm2 start server.js --name "$APP_NAME" --update-env || {
            log_error "Failed to start application with PM2"
            exit 1
        }
        
        # Save PM2 process list
        pm2 save || true
        
        log_success "Application started with PM2"
        
        # Show status
        sleep 2
        pm2 status
    else
        log_warning "Starting application in background (not using PM2)"
        nohup node server.js > "$APP_DIR/app.log" 2>&1 &
        echo $! > "$APP_DIR/app.pid"
        log_success "Application started (PID: $(cat "$APP_DIR/app.pid"))"
    fi
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait a bit for the server to start
    sleep 3
    
    # Check if process is running
    if [ "$USE_PM2" = true ]; then
        if pm2 list | grep -q "$APP_NAME.*online"; then
            log_success "Application is running"
        else
            log_error "Application is not running"
            pm2 logs "$APP_NAME" --lines 20
            exit 1
        fi
    else
        if [ -f "$APP_DIR/app.pid" ]; then
            PID=$(cat "$APP_DIR/app.pid")
            if ps -p "$PID" > /dev/null 2>&1; then
                log_success "Application is running (PID: $PID)"
            else
                log_error "Application process not found"
                exit 1
            fi
        fi
    fi
    
    # Try to check health endpoint if available
    PORT=$(grep -E "^PORT=" "$APP_DIR/.env" 2>/dev/null | cut -d'=' -f2 || echo "3000")
    if command -v curl &> /dev/null; then
        if curl -f -s "http://localhost:${PORT}/api/health" > /dev/null 2>&1; then
            log_success "Health check passed"
        else
            log_warning "Health check failed (this might be normal if endpoint doesn't exist)"
        fi
    fi
}

show_summary() {
    log_success "================================================"
    log_success "Deployment completed successfully!"
    log_success "================================================"
    echo ""
    echo "Application Name: $APP_NAME"
    echo "Directory: $APP_DIR"
    echo "Deployment Time: $(date)"
    echo ""
    
    if [ "$USE_PM2" = true ]; then
        echo "Useful commands:"
        echo "  pm2 status              - Check application status"
        echo "  pm2 logs $APP_NAME      - View application logs"
        echo "  pm2 monit               - Monitor application"
        echo "  pm2 restart $APP_NAME   - Restart application"
        echo "  pm2 stop $APP_NAME      - Stop application"
    fi
    
    echo ""
    echo "Database backup location: $BACKUP_DIR"
    echo "Deployment log: $LOG_FILE"
    echo ""
    log_info "Remember to verify the application is working correctly!"
}

rollback() {
    log_warning "Rolling back deployment..."
    
    # Stop the application
    stop_application
    
    # Restore database from backup
    if [ -f "$BACKUP_DIR/${DB_NAME}.backup_"*.gz ]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR/${DB_NAME}.backup_"*.gz 2>/dev/null | head -n1)
        if [ -n "$LATEST_BACKUP" ]; then
            log_info "Restoring database from $LATEST_BACKUP"
            gunzip -c "$LATEST_BACKUP" > "$APP_DIR/$DB_NAME"
            log_success "Database restored"
        fi
    fi
    
    # Restart application
    start_application
    
    log_success "Rollback completed"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --use-git)
            USE_GIT=true
            shift
            ;;
        --no-pm2)
            USE_PM2=false
            shift
            ;;
        --app-dir=*)
            APP_DIR="${1#*=}"
            shift
            ;;
        --backup-dir=*)
            BACKUP_DIR="${1#*=}"
            shift
            ;;
        --rollback)
            rollback
            exit 0
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-backup          Skip database backup"
            echo "  --skip-install         Skip npm install"
            echo "  --skip-migrations      Skip running migrations"
            echo "  --use-git              Pull latest changes from git"
            echo "  --no-pm2               Don't use PM2 (use nohup instead)"
            echo "  --app-dir=DIR          Application directory (default: current directory)"
            echo "  --backup-dir=DIR       Backup directory (default: ./backups)"
            echo "  --rollback             Rollback to previous version"
            echo "  --help                 Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  APP_DIR                Application directory"
            echo "  BACKUP_DIR             Backup directory"
            echo "  LOG_FILE               Log file path"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main deployment flow
main() {
    log_info "================================================"
    log_info "Starting Production Deployment"
    log_info "================================================"
    log_info "Application: $APP_NAME"
    log_info "Directory: $APP_DIR"
    log_info "Timestamp: $(date)"
    log_info "================================================"
    echo ""
    
    check_prerequisites
    backup_database
    stop_application
    pull_latest_changes
    install_dependencies
    run_migrations
    start_application
    verify_deployment
    show_summary
    
    log_success "Deployment completed successfully!"
}

# Run main function
main

