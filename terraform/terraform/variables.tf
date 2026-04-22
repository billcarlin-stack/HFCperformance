variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "region" {
  description = "The GCP Region"
  type        = string
  default     = "australia-southeast1"
}

variable "env" {
  description = "The environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}
