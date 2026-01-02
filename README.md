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

## Statistics Data

Edit `static/statistics_bar_charts.json` to customize dashboard charts:

```json
{
  "chart_name": {
    "title": "Chart Title",
    "x_axis": ["Label1", "Label2", "Label3"],
    "values": [100, 200, 150]
  }
}
```

- `chart_name`: unique identifier for the chart
- `title`: display title
- `x_axis`: array of labels
- `values`: array of numbers (must match x_axis length)

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
