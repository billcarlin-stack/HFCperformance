"""
The Nest — Firebase Admin SDK Initialiser

Initialises the Firebase Admin SDK once at startup.
It uses Application Default Credentials (ADC) when running on GCP (Cloud Run),
which automatically uses the Cloud Run service account — no JSON key file needed.

For local development, set the GOOGLE_APPLICATION_CREDENTIALS env var to
point to your downloaded Firebase service account JSON.
"""

import os
import logging
import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger(__name__)

_firebase_app = None


def get_firebase_app():
    """
    Returns the initialized Firebase Admin app (singleton).
    Initializes on first call using ADC (works automatically on Cloud Run).
    """
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        # On Cloud Run, ADC automatically picks up the service account.
        # Locally, GOOGLE_APPLICATION_CREDENTIALS must point to a service account JSON.
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized with service account JSON.")
        else:
            # Use Application Default Credentials (ADC) — works on Cloud Run automatically
            # We MUST specify projectId so verify_id_token knows who the audience is.
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "bill-sandpit")
            _firebase_app = firebase_admin.initialize_app(options={"projectId": project_id})
            logger.info(f"Firebase Admin initialized with ADC for project {project_id}.")
    except ValueError:
        # App already initialized (e.g. in tests), get the default
        _firebase_app = firebase_admin.get_app()

    return _firebase_app
