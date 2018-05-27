locals {
  event_consumer_archive_name    = "${var.event_consumer_function_name}-${var.event_consumer_version}.zip"
  event_consumer_archive_soirce  = "${var.event_consumer_function_name}-${var.event_consumer_version}.zip"
  event_publisher_archive_name   = "${var.event_publisher_function_name}-${var.event_publisher_version}.zip"
  event_publisher_archive_soirce = "${var.event_publisher_function_name}-${var.event_publisher_version}.zip"
  redirect_archive_name          = "${var.redirect_function_name}-${var.redirect_version}.zip"
  redirect_archive_source        = "${var.redirect_function_name}-${var.redirect_version}.zip"
  slash_command_archive_name     = "${var.slash_command_function_name}-${var.slash_command_version}.zip"
  slash_command_archive_source   = "${var.slash_command_function_name}-${var.slash_command_version}.zip"
}
