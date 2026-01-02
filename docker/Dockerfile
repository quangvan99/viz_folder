# FolderTree - Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Copy application files
COPY server.py .
COPY static/ ./static/

# Create data directory for mounting
RUN mkdir -p /data

# Environment variables
ENV PORT=8000
ENV SERVE_DIR=/data
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["python", "server.py"]
