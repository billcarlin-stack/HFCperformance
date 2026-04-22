# ──────────────────────────────────────────────────────────────
# The Hawk Hub — Dockerfile
# Production container for Google Cloud Run deployment
# ──────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies (if needed for google-cloud-bigquery)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# ── Dependencies ──────────────────────────────────────────────
FROM base AS dependencies

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Application ───────────────────────────────────────────────
FROM dependencies AS application

# Copy application code
COPY . .

# Cloud Run uses PORT env variable (default 8080)
ENV PORT=8080
EXPOSE 8080

# Run with Gunicorn using our config
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
