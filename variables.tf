/**
 * Required Variables
 */
variable "channel" {
  description = "Slack channel ID for logging messages."
}

variable "project" {
  description = "The ID of the project to apply any resources to."
}

variable "service_account" {
  description = "An email address that represents a service account. For example, my-other-app@appspot.gserviceaccount.com."
}

variable "verification_token" {
  description = "Slack verification token."
}

variable "web_api_token" {
  description = "Slack Web API token."
}

/**
 * Optional Variables
 */
variable "color" {
  description = "Default color for slackbot message attachments."
  default     = "good"
}

variable "events_pubsub_topic" {
  description = "Pub/Sub topic name."
  default     = "slack-drive-events"
}

variable "event_consumer_function_name" {
  description = "Cloud Function for consuming events published to Pub/Sub."
  default     = "slack-drive-event-consumer"
}

variable "event_publisher_function_name" {
  description = "Cloud Function for publishing events from Slack to Pub/Sub."
  default     = "slack-drive-event-publisher"
}

variable "redirect_function_name" {
  description = "Cloud Function for redirecting to Google Drive from Slack."
  default     = "slack-drive-redirect"
}

variable "region" {
  description = "The region to operate under, if not specified by a given resource."
  default     = "us-central1"
}

variable "slash_command" {
  description = "Name of slash command in Slack"
  default     = "drive"
}

variable "slash_command_function_name" {
  description = "Cloud Function for receiving slash-commands from Slack."
  default     = "slack-drive-slash-command"
}
