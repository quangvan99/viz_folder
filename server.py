#!/usr/bin/env python3
"""FolderTree - Custom Python File Server with tree-style directory browser."""

import os
import json
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Initialize mimetypes with common types
mimetypes.init()
mimetypes.add_type('video/mp4', '.mp4')
mimetypes.add_type('video/webm', '.webm')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

# App directory (where server.py and static/ reside)
APP_DIR = os.path.dirname(os.path.abspath(__file__))
# Base directory for file serving (configurable via env)
BASE_DIR = os.environ.get('SERVE_DIR', os.getcwd())
PORT = int(os.environ.get('PORT', 8000))


class FolderTreeHandler(SimpleHTTPRequestHandler):
    """HTTP handler with API endpoints for tree listing and file streaming."""

    def do_GET(self):
        """Route requests to appropriate handlers."""
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/':
            self.serve_static('static/index.html')
        elif path.startswith('/api/tree'):
            self.handle_tree(parse_qs(parsed.query))
        elif path.startswith('/api/stats'):
            self.handle_stats()
        elif path.startswith('/api/file'):
            self.handle_file(parse_qs(parsed.query))
        elif path.startswith('/static/'):
            self.serve_static(path[1:])  # Remove leading /
        else:
            self.send_error(404, "Not Found")

    def safe_path(self, requested):
        """Prevent path traversal attacks by validating against BASE_DIR."""
        if not requested:
            return BASE_DIR
        # Normalize and resolve to real path
        full = os.path.realpath(os.path.join(BASE_DIR, requested))
        base_real = os.path.realpath(BASE_DIR)
        # Must be within BASE_DIR
        if full == base_real or full.startswith(base_real + os.sep):
            return full
        return None

    def handle_tree(self, params):
        """Return directory listing as JSON."""
        path = params.get('path', [''])[0]
        safe = self.safe_path(path)

        if not safe:
            self.send_error(403, "Access denied")
            return

        if not os.path.isdir(safe):
            self.send_error(404, "Directory not found")
            return

        try:
            children = []
            for name in sorted(os.listdir(safe)):
                # Skip hidden files
                if name.startswith('.'):
                    continue
                full = os.path.join(safe, name)
                try:
                    stat = os.stat(full)
                    entry = {
                        'name': name,
                        'type': 'directory' if os.path.isdir(full) else 'file',
                        'size': stat.st_size,
                        'modified': stat.st_mtime
                    }
                    if entry['type'] == 'file':
                        entry['mime'] = mimetypes.guess_type(name)[0] or 'application/octet-stream'
                    children.append(entry)
                except (OSError, PermissionError):
                    # Skip files we can't access
                    continue

            self.send_json({'path': path, 'children': children})
        except (OSError, PermissionError) as e:
            self.send_error(500, str(e))

    def handle_file(self, params):
        """Stream file content with proper MIME type."""
        path = params.get('path', [''])[0]
        safe = self.safe_path(path)

        if not safe:
            self.send_error(403, "Access denied")
            return

        if not os.path.isfile(safe):
            self.send_error(404, "File not found")
            return

        try:
            mime = mimetypes.guess_type(safe)[0] or 'application/octet-stream'
            size = os.path.getsize(safe)

            # Support Range requests for video seeking
            range_header = self.headers.get('Range')
            if range_header and range_header.startswith('bytes='):
                self.serve_range(safe, mime, size, range_header)
            else:
                self.serve_full(safe, mime, size)
        except (OSError, PermissionError) as e:
            self.send_error(500, str(e))

    def handle_stats(self):
        """Return statistics data for dashboard charts."""
        stats_path = os.path.join(APP_DIR, 'static', 'statistics_bar_charts.json')

        if not os.path.isfile(stats_path):
            self.send_error(404, "Statistics file not found")
            return

        try:
            with open(stats_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.send_json(data)
        except (OSError, json.JSONDecodeError) as e:
            self.send_error(500, str(e))

    def serve_full(self, filepath, mime, size):
        """Serve full file content."""
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', size)
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()

        with open(filepath, 'rb') as f:
            while chunk := f.read(65536):  # 64KB chunks
                self.wfile.write(chunk)

    def serve_range(self, filepath, mime, size, range_header):
        """Serve partial content for Range requests (video seeking)."""
        try:
            range_spec = range_header[6:]  # Remove 'bytes='
            start, end = range_spec.split('-')
            start = int(start) if start else 0
            end = int(end) if end else size - 1
            end = min(end, size - 1)
            length = end - start + 1

            self.send_response(206)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', length)
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()

            with open(filepath, 'rb') as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = f.read(min(65536, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (ValueError, OSError):
            # Fall back to full file on parse error
            self.serve_full(filepath, mime, size)

    def serve_static(self, filepath):
        """Serve static files from the app directory (not SERVE_DIR)."""
        # Static files are served from APP_DIR, not BASE_DIR
        static_path = os.path.join(APP_DIR, filepath)
        real_static = os.path.realpath(static_path)
        real_app = os.path.realpath(APP_DIR)

        # Security: must be within APP_DIR
        if not (real_static == real_app or real_static.startswith(real_app + os.sep)):
            self.send_error(403, "Access denied")
            return

        if not os.path.isfile(real_static):
            self.send_error(404, "File not found")
            return

        mime = mimetypes.guess_type(real_static)[0] or 'application/octet-stream'
        size = os.path.getsize(real_static)

        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', size)
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()

        with open(real_static, 'rb') as f:
            self.wfile.write(f.read())

    def send_json(self, data, status=200):
        """Send JSON response with proper headers."""
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        """Suppress verbose logging in production."""
        if os.environ.get('DEBUG'):
            super().log_message(format, *args)


if __name__ == '__main__':
    print(f'FolderTree serving {BASE_DIR}')
    print(f'Open http://localhost:{PORT}')
    with HTTPServer(('', PORT), FolderTreeHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nShutting down...')
