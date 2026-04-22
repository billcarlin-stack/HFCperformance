"""
The Hawk Hub — BigQuery Client

Thread-safe singleton for the Google Cloud BigQuery client.
All data access modules should import `get_bq_client` from here.
"""

from google.cloud import bigquery

_client = None


def get_bq_client() -> bigquery.Client:
    """
    Returns a singleton BigQuery client instance.

    The client is thread-safe and reusable across requests.
    It uses Application Default Credentials (ADC) — either a service
    account on Cloud Run or `gcloud auth application-default login` locally.
    """
    global _client
    if _client is None:
        _client = bigquery.Client()
    return _client
