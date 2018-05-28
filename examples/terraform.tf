module "slack_drive_cloud" {
  source            = "amancevice/slack-drive/google"
  version           = "0.1.0"
  bucket_name       = "my-project-slack-drive"
  cloud_credentials = "${file("client_secret.json")}"
  cloud_project_id  = "my-project-123456"
  cloud_region      = "us-central1"
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
