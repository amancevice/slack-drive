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
