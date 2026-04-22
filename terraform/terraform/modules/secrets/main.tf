resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "DB_PASSWORD"
  replication {
    user_managed {
      replicas {
        location = "australia-southeast1"
      }
    }
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# Grant Cloud Run service account access to the secret
resource "google_secret_manager_secret_iam_member" "db_password_accessor" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_run_service_account}"
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}

output "db_password_secret_id" {
  value = google_secret_manager_secret.db_password.secret_id
}

variable "project_id" {}
variable "env" {}
variable "cloud_run_service_account" {}
