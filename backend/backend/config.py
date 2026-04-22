"""
The Hawk Hub — Application Configuration

Environment-driven configuration for the Flask backend.
All sensitive values are loaded from environment variables.
"""

import os


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "hawk-spirit-dev-key")
    DEBUG = False
    TESTING = False

    # Google Cloud
    GOOGLE_CLOUD_PROJECT = os.environ.get(
        "GOOGLE_CLOUD_PROJECT", "bill-sandpit"
    )

    # BigQuery
    BQ_DATASET = os.environ.get("BQ_DATASET", "hfc_performance_hub")
    BQ_PLAYERS_TABLE = "players_2026"
    BQ_WELLBEING_TABLE = "wellbeing_surveys"
    BQ_IDP_TABLE = "idp_ratings"
    BQ_AVAILABILITY_TABLE = "team_availability"
    BQ_COACH_RATINGS_TABLE = "coach_ratings"

    # Cloud SQL / PostgreSQL
    @property
    def DATABASE_URL(self):
        # 1. Check for Cloud SQL Auth Proxy (Unix Socket) Env Vars (Preferred for Production)
        conn_name = os.environ.get("DB_CONNECTION_NAME")
        db_pass = os.environ.get("DB_PASSWORD")
        db_name = os.environ.get("DB_NAME", "hfc_prod")
        db_user = os.environ.get("DB_USER", "postgres")

        if conn_name and db_pass:
            # Construct Unix socket URL for Cloud Run
            # Format: postgresql+pg8000://<user>:<pass>@/<db>?unix_sock=/cloudsql/<conn_name>/.s.PGSQL.5432
            return f"postgresql+pg8000://{db_user}:{db_pass}@/{db_name}?unix_sock=/cloudsql/{conn_name}/.s.PGSQL.5432"

        # 2. Fallback to legacy DATABASE_URL string
        url = os.environ.get(
            "DATABASE_URL", 
            "postgresql://postgres:postgres@localhost:5432/hfc_dev"
        )
        
        # Ensure sslmode=require for legacy connections if not specified
        if "10.31.0.2" in url or os.environ.get("FLASK_ENV") == "production":
            if "sslmode" not in url and "unix_sock" not in url:
                separator = "&" if "?" in url else "?"
                url = f"{url}{separator}sslmode=require"
        return url

    # BI Agent
    BI_AGENT_URL = os.environ.get(
        "BI_AGENT_URL", "http://localhost:8080"
    )

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
        [
            "https://hfc-performance.vercel.app",
            "https://the-nest.vercel.app",
            "https://the-nest-frontend-5uobur46ca-ts.a.run.app",
            "https://the-nest-frontend-114675580879.australia-southeast1.run.app",
        ]
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
