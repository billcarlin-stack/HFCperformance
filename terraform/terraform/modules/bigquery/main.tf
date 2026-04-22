resource "google_bigquery_dataset" "dataset" {
  dataset_id                  = "hfc_performance_hub"
  friendly_name               = "Hawthorn FC Performance Hub"
  description                 = "Central repository for player wellbeing, fitness, and coach data."
  location                    = "australia-southeast1"
  default_table_expiration_ms = 3600000 * 24 * 365 * 10 # 10 years
}

resource "google_bigquery_table" "players" {
  dataset_id = google_bigquery_dataset.dataset.dataset_id
  table_id   = "players_2026"
  deletion_protection = false

  schema = <<EOF
[
  {"name": "jumper_no", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "age", "type": "INTEGER", "mode": "NULLABLE"},
  {"name": "height_cm", "type": "FLOAT", "mode": "NULLABLE"},
  {"name": "weight_kg", "type": "FLOAT", "mode": "NULLABLE"},
  {"name": "games", "type": "INTEGER", "mode": "NULLABLE"},
  {"name": "position", "type": "STRING", "mode": "NULLABLE"},
  {"name": "status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "photo_url", "type": "STRING", "mode": "NULLABLE"}
]
EOF
}

variable "project_id" {}
variable "region" {}
variable "env" {}
