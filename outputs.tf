output "event_consumer_output_path" {
  value = "${data.archive_file.event_consumer.output_path}"
}

output "event_publisher_output_path" {
  value = "${data.archive_file.event_publisher.output_path}"
}

output "redirect_output_path" {
  value = "${data.archive_file.redirect.output_path}"
}

output "slash_command_output_path" {
  value = "${data.archive_file.slash_command.output_path}"
}
