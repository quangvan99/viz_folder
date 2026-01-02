#!/bin/bash
# FolderTree - View Logs
# Usage: ./scripts/log.sh [-f]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [[ "$1" == "-f" ]]; then
    docker compose -f docker/docker-compose.yml logs -f foldertree
else
    docker compose -f docker/docker-compose.yml logs --tail=100 foldertree
fi
