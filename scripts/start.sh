#!/bin/bash
# FolderTree - Start Production
# Usage: ./scripts/start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env file
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

echo "🚀 Starting FolderTree (Production)"
echo "📂 Serving: $SERVE_DIR"
echo "🌐 URL: http://localhost:8090"

cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.yml up -d --build

echo "✅ FolderTree is running at http://localhost:8090"
