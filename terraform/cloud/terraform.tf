provider "google" {
  credentials = "${var.cloud_credentials}"
  project     = "${var.cloud_project}"
  region      = "${var.cloud_region}"
}

variable "cloud_credentials" {
  description = "Contents of the JSON file used to describe your account credentials, downloaded from Google Cloud Console."
}

variable "cloud_project" {
  description = "The ID of the project to apply any resources to."
}

variable "cloud_region"{
  description = "The region to operate under, if not specified by a given resource."
}

variable "bucket_name" {
  description = "Cloud Storage bucket for storing Cloud Function code archives"
}

variable "bucket_storage_class" {
  description = "Bucket storage class"
  default     = "MULTI_REGIONAL"
}

variable "events_pubsub_topic" {
  description = "Pub/Sub topic name"
  default     = "slack-drive-events"
}

variable "event_consumer_function_name" {
  description = "Cloud Function for consuming events published to Pub/Sub"
  default     = "slack-drive-event-consumer"
}

variable "event_consumer_memory" {
  description = "Memory for Slack event consumer"
  default     = 128
}

variable "event_consumer_timeout" {
  description = "Timeout in seconds for Slack event consumer"
  default     = 60
}

variable "event_consumer_archive_name" {
  description = "Name of event consumer archive"
  default     = "slack-drive-event-consumer-0.0.1.zip"
}

variable "event_consumer_archive_source" {
  description = "Path to archive for event consumer archive"
}

variable "event_publisher_function_name" {
  description = "Cloud Function for publishing events from Slack to Pub/Sub"
  default     = "slack-drive-event-publisher"
}

variable "event_publisher_memory" {
  description = "Memory for Slack event listener"
  default     = 128
}

variable "event_publisher_timeout" {
  description = "Timeout in seconds for Slack event listener"
  default     = 60
}

variable "event_publisher_archive_name" {
  description = "Name of event publisher archive"
  default     = "slack-drive-event-publisher-0.0.1.zip"
}

variable "event_publisher_archive_source" {
  description = "Path to archive for event publisher archive"
}

variable "redirect_function_name" {
  description = "Cloud Function for redirecting to Google Drive from Slack"
  default     = "slack-drive-redirect"
}

variable "redirect_memory" {
  description = "Memory for Slack redirect"
  default     = 128
}

variable "redirect_timeout" {
  description = "Timeout in seconds for redirect"
  default     = 60
}

variable "redirect_archive_name" {
  description = "Name of redirect archive"
  default     = "slack-drive-redirect-0.0.1.zip"
}

variable "redirect_archive_source" {
  description = "Path to archive for redirect archive"
}

variable "slash_command_function_name" {
  description = "Cloud Function for receiving slash-commands from Slack"
  default     = "slack-drive-slash-command"
}

variable "slash_command_memory" {
  description = "Memory for Slack slash command"
  default     = 128
}

variable "slash_command_timeout" {
  description = "Timeout in seconds for Slack slash command"
  default     = 60
}

variable "slash_command_archive_name" {
  description = "Name of slash command archive"
  default     = "slack-drive-slash-command-0.0.1.zip"
}

variable "slash_command_archive_source" {
  description = "Path to archive for slash command archive"
}

resource "google_storage_bucket" "slack_drive_bucket" {
  name          = "${var.bucket_name}"
  storage_class = "${var.bucket_storage_class}"
}

resource "google_storage_bucket_object" "event_consumer_archive" {
  name   = "${var.event_consumer_archive_name}"
  bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source = "${var.event_consumer_archive_source}"
}

resource "google_storage_bucket_object" "event_publisher_archive" {
  name   = "${var.event_publisher_archive_name}"
  bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source = "${var.event_publisher_archive_source}"
}

resource "google_storage_bucket_object" "redirect_archive" {
  name   = "${var.redirect_archive_name}"
  bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source = "${var.redirect_archive_source}"
}

resource "google_storage_bucket_object" "slash_command_archive" {
  name   = "${var.slash_command_archive_name}"
  bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source = "${var.slash_command_archive_source}"
}

resource "google_pubsub_topic" "slack_events" {
  name = "${var.events_pubsub_topic}"
}

resource "google_cloudfunctions_function" "event_consumer" {
  name                  = "${var.event_consumer_function_name}"
  description           = "Slack event consumer"
  available_memory_mb   = "${var.event_consumer_memory}"
  source_archive_bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source_archive_object = "${google_storage_bucket_object.event_consumer_archive.name}"
  trigger_topic         = "${google_pubsub_topic.slack_events.name}"
  timeout               = "${var.event_consumer_timeout}"
  entry_point           = "consumeEvent"

  labels {
    deployment-tool = "terraform"
  }
}

resource "google_cloudfunctions_function" "event_publisher" {
  name                  = "${var.event_publisher_function_name}"
  description           = "Slack event publisher"
  available_memory_mb   = "${var.event_publisher_memory}"
  source_archive_bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source_archive_object = "${google_storage_bucket_object.event_publisher_archive.name}"
  trigger_http          = true
  timeout               = "${var.event_publisher_timeout}"
  entry_point           = "publishEvent"

  labels {
    deployment-tool = "terraform"
  }
}

resource "google_cloudfunctions_function" "redirect" {
  name                  = "${var.redirect_function_name}"
  description           = "Redirect to Google Drive"
  available_memory_mb   = "${var.redirect_memory}"
  source_archive_bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source_archive_object = "${google_storage_bucket_object.redirect_archive.name}"
  trigger_http          = true
  timeout               = "${var.redirect_timeout}"
  entry_point           = "redirect"

  labels {
    deployment-tool = "terraform"
  }
}

resource "google_cloudfunctions_function" "slash_command" {
  name                  = "${var.slash_command_function_name}"
  description           = "Slack /slash command HTTP handler"
  available_memory_mb   = "${var.slash_command_memory}"
  source_archive_bucket = "${google_storage_bucket.slack_drive_bucket.name}"
  source_archive_object = "${google_storage_bucket_object.slash_command_archive.name}"
  trigger_http          = true
  timeout               = "${var.slash_command_timeout}"
  entry_point           = "slashCommand"

  labels {
    deployment-tool = "terraform"
  }
}
