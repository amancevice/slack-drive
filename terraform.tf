module "slack_drive_cloud" {
  source            = "amancevice/slack-drive/google"
  version           = "0.1.2"
  app_version       = "0.1.0" // this should match `package.json`
  bucket_name       = "${var.bucket_name}"
  cloud_credentials = "${file("client_secret.json")}"
  cloud_project     = "${var.cloud_project}"
  cloud_region      = "${var.cloud_region}"
  service_account   = "${var.service_account}"
}

variable "bucket_name" {
  description = "Cloud Storage bucket for storing Cloud Function code archives."
  //default     = "my-project-slack-drive"
}

variable "cloud_project" {
  description = "The ID of the project to apply any resources to."
  //default     = "my-project-123456"
}

variable "cloud_region" {
  description = "The region to operate under, if not specified by a given resource."
  default     = "us-central1"
}

variable "service_account" {
  description = "An email address that represents a service account. For example, my-other-app@appspot.gserviceaccount.com."
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
