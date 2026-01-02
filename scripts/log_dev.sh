#!/bin/bash
# FolderTree - View Development Logs
# Usage: ./scripts/log_dev.sh [-f]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [[ "$1" == "-f" ]]; then
    docker compose -f docker/docker-compose.dev.yml logs -f foldertree-dev
else
    docker compose -f docker/docker-compose.dev.yml logs --tail=100 foldertree-dev
fi
