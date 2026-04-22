terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "project_setup" {
  source     = "./modules/project-setup"
  project_id = var.project_id
}

module "bigquery" {
  source     = "./modules/bigquery"
  project_id = var.project_id
  region     = var.region
  env        = var.env

  depends_on = [module.project_setup]
}

module "secrets" {
  source     = "./modules/secrets"
  project_id = var.project_id
  env        = var.env
  
  # Allow the Cloud Run service account access to the secret
  cloud_run_service_account = module.cloudrun.service_account_email

  depends_on = [module.project_setup]
}

module "cloudsql" {
  source     = "./modules/cloudsql"
  project_id = var.project_id
  region     = var.region
  env        = var.env
  
  # Inject the generated password from the secrets module
  db_password = module.secrets.db_password

  depends_on = [module.project_setup]
}

module "cloudrun" {
  source     = "./modules/cloudrun"
  project_id = var.project_id
  region     = var.region
  env        = var.env
  
  # Pass the connection name for the Auth Proxy
  db_connection_name = module.cloudsql.instance_connection_name
  db_name            = module.cloudsql.db_name
  db_user            = module.cloudsql.db_user
  
  # Inject the secret reference (not the value)
  db_password_secret_id = module.secrets.db_password_secret_id

  depends_on = [module.project_setup]
}

module "cloudstorage" {
  source     = "./modules/cloudstorage"
  project_id = var.project_id
  region     = var.region
  env        = var.env

  depends_on = [module.project_setup]
}

output "project_id" {
  value = var.project_id
}

output "cloud_run_url" {
  value = module.cloudrun.service_url
}
