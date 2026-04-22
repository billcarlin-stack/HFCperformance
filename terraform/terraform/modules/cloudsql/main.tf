resource "google_sql_database_instance" "instance" {
  name             = "the-nest-db-${var.env}"
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = "db-f1-micro"
    
    # Public IP enabled, but limited to Auth Proxy connection
    ip_configuration {
      ipv4_enabled = true
      # No authorized networks added here for security
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "database" {
  name     = "hfc_prod"
  instance = google_sql_database_instance.instance.name
}

resource "google_sql_user" "users" {
  name     = "postgres"
  instance = google_sql_database_instance.instance.name
  password = var.db_password
}

output "instance_connection_name" {
  value = google_sql_database_instance.instance.connection_name
}

output "db_name" {
  value = google_sql_database.database.name
}

output "db_user" {
  value = google_sql_user.users.name
}

variable "project_id" {}
variable "region" {}
variable "env" {}
variable "db_password" {}
