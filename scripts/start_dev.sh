#!/bin/bash
# FolderTree - Start Development
# Usage: ./scripts/start_dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env file
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

echo "🔧 Starting FolderTree (Development)"
echo "📂 Serving: $SERVE_DIR"
echo "🌐 URL: http://localhost:8091"

cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.dev.yml up -d --build

echo "✅ FolderTree (dev) is running at http://localhost:8091"
