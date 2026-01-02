#!/bin/bash
# FolderTree - Stop Development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🛑 Stopping FolderTree (Development)"

cd "$PROJECT_DIR"

# Source .env file for SERVE_DIR
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

docker compose -f docker/docker-compose.dev.yml down

echo "✅ FolderTree (dev) stopped"
