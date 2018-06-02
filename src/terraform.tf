provider "google" {
  credentials = "${file("client_secret.json")}"
  project     = "${var.project}"
  region      = "us-central1"
  version     = "~> 1.13"
}

module "slack_drive_cloud" {
  source             = "amancevice/slack-drive/google"
  version            = "0.5.0"
  bucket_name        = "${var.bucket_name}"
  channel            = "${var.channel}"
  config             = "${file("config.tpl")}"
  project            = "${var.project}"
  service_account    = "${var.service_account}"
  verification_token = "${var.verification_token}"
  web_api_token      = "${var.web_api_token}"
}

variable "bucket_name" {
  description = "Cloud Storage bucket for storing Cloud Function code archives."
  //default     = "my-project-slack-drive"
}

variable "channel" {
  description = "Slack channel ID for logging messages."
  //default     = "CABCD1234"
}

variable "project" {
  description = "The ID of the project to apply any resources to."
  //default     = "my-project-123456"
}

variable "service_account" {
  description = "An email address that represents a service account. For example, my-other-app@appspot.gserviceaccount.com."
  //default     = "name@project.iam.gserviceaccount.com"
}

variable "verification_token" {
  description = "Slack verification token."
  //default     = "<token>"
}

variable "web_api_token" {
  description = "Slack Web API token."
  //default     = "<token>"
}

output "event_pubsub_topic" {
  value = "${module.slack_drive_cloud.event_pubsub_topic}"
}

output "event_subscriptions_url" {
  value = "${module.slack_drive_cloud.event_subscriptions_url}"
}

output "redirect_url" {
  value = "${module.slack_drive_cloud.redirect_url}"
}

output "slash_command_url" {
  value = "${module.slack_drive_cloud.slash_command_url}"
}
