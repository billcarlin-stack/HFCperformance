"""
The Hawk Hub — Gunicorn Configuration

Production WSGI server settings for Cloud Run deployment.
"""

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker processes
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "sync"
worker_tmp_dir = "/dev/shm"

# Timeouts
timeout = 300
graceful_timeout = 60
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info")

# Process naming
proc_name = "hawk-hub"

# Server mechanics
preload_app = False
max_requests = 1000
max_requests_jitter = 50
