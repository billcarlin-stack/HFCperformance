resource "google_cloud_run_service" "api" {
  name     = "the-nest-api"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/the-nest-api:latest"
        
        env {
          name  = "FLASK_ENV"
          value = "production"
        }
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "BQ_DATASET"
          value = "hfc_performance_hub"
        }
        
        # Secret Manager injection for the DB password
        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = var.db_password_secret_id
              key  = "latest"
            }
          }
        }
        
        # Cloud SQL Connection Name
        env {
          name  = "DB_CONNECTION_NAME"
          value = var.db_connection_name
        }
        env {
          name  = "DB_NAME"
          value = var.db_name
        }
        env {
          name  = "DB_USER"
          value = var.db_user
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"      = "10"
        "run.googleapis.com/cloudsql-instances" = var.db_connection_name
        "run.googleapis.com/client-name"         = "terraform"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM: Allow unauthenticated access (as per existing setup)
resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_service.api.location
  project  = google_cloud_run_service.api.project
  service  = google_cloud_run_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# IAM: Grant the service account the Cloud SQL Client role
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

data "google_compute_default_service_account" "default" {
  project = var.project_id
}

output "service_url" {
  value = google_cloud_run_service.api.status[0].url
}

output "service_account_email" {
  value = data.google_compute_default_service_account.default.email
}

variable "project_id" {}
variable "region" {}
variable "env" {}
variable "db_connection_name" {}
variable "db_name" {}
variable "db_user" {}
variable "db_password_secret_id" {}
