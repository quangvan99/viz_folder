# FolderTree

Web-based file browser with hot-reload support.

## Setup

1. Configure `.env`:
```
SERVE_DIR=/path/to/your/folder
```

2. Start:
```bash
./scripts/start.sh
```

3. Open http://localhost:8091

## Commands

| Command | Description |
|---------|-------------|
| `./scripts/start.sh` | Start server |
| `./scripts/stop.sh` | Stop server |
| `./scripts/log.sh` | View logs |
| `./scripts/log.sh -f` | Follow logs |

## Structure

```
scripts/
  start.sh
  stop.sh
  log.sh
docker/
  Dockerfile
  docker-compose.yml
static/
  index.html
  app.js
  style.css
server.py
.env
```
