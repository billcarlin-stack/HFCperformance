"""
The Shinboner Hub — Application Configuration

Environment-driven configuration for the Flask backend.
All sensitive values are loaded from environment variables.
"""

import os


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "shinboner-spirit-dev-key")
    DEBUG = False
    TESTING = False

    # Google Cloud
    GOOGLE_CLOUD_PROJECT = os.environ.get(
        "GOOGLE_CLOUD_PROJECT", "bill-sandpit"
    )

    # BigQuery
    BQ_DATASET = os.environ.get("BQ_DATASET", "nmfc_performance_hub")
    BQ_PLAYERS_TABLE = "players_2026"
    BQ_WELLBEING_TABLE = "wellbeing_surveys"
    BQ_IDP_TABLE = "idp_ratings"
    BQ_AVAILABILITY_TABLE = "team_availability"

    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

    @property
    def bq_table_ref(self):
        """Returns fully qualified table reference prefix."""
        return f"{self.GOOGLE_CLOUD_PROJECT}.{self.BQ_DATASET}"


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True


class ProductionConfig(Config):
    """Production configuration for Cloud Run."""

    DEBUG = False
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS", 
        ["https://shinbonerhub.nmfc.com.au", "https://the-pouch.vercel.app"]
    )


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    DEBUG = True


# Config selector
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    """Returns the active configuration based on FLASK_ENV."""
    env = os.environ.get("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)()
