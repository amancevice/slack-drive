provider "google" {
  credentials = "${var.cloud_credentials}"
  project     = "${var.cloud_project}"
  region      = "${var.cloud_region}"
  version     = "${var.cloud_version}"
}
