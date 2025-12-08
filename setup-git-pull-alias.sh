#!/bin/bash
# Setup script to create a git alias that automatically handles SQLite WAL files

# Create a git alias that handles WAL files automatically during pull
git config alias.pull-safe '!f() { \
  if [ -f prompts.db-shm ] || [ -f prompts.db-wal ]; then \
    echo "Temporarily moving SQLite WAL files..."; \
    mv prompts.db-shm prompts.db-shm.tmp 2>/dev/null || true; \
    mv prompts.db-wal prompts.db-wal.tmp 2>/dev/null || true; \
    git pull origin main "$@"; \
    EXIT_CODE=$?; \
    mv prompts.db-shm.tmp prompts.db-shm 2>/dev/null || true; \
    mv prompts.db-wal.tmp prompts.db-wal 2>/dev/null || true; \
    exit $EXIT_CODE; \
  else \
    git pull origin main "$@"; \
  fi \
}; f'

echo "Git alias 'pull-safe' created successfully!"
echo ""
echo "Usage: git pull-safe"
echo ""
echo "This alias will automatically handle SQLite WAL files during pull operations."

