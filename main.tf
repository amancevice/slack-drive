provider "archive" {
  version = "~> 1.0"
}

provider "template" {
  version = "~> 1.0"
}

// Config template
data "template_file" "config" {
  template = "${file("${path.module}/config.example.json")}"

  vars {
    channel                = "${var.channel}"
    color                  = "${var.color}"
    events_pubsub_topic    = "${var.events_pubsub_topic}"
    project                = "${var.project}"
    redirect_function_name = "${var.redirect_function_name}"
    region                 = "${var.region}"
    slash_command          = "${var.slash_command}"
    verification_token     = "${var.verification_token}"
    web_api_token          = "${var.web_api_token}"
  }
}

// Event Consumer archive
data "archive_file" "event_consumer" {
  type        = "zip"
  output_path = "${path.module}/dist/${var.event_consumer_function_name}.zip"

  source {
    content  = "${file("${path.module}/src/event-consumer/index.js")}"
    filename = "index.js"
  }

  source {
    content  = "${file("${path.module}/src/event-consumer/package.json")}"
    filename = "package.json"
  }

  source {
    content  = "${file("${path.module}/src/messages.json")}"
    filename = "messages.json"
  }

  source {
    content  = "${data.template_file.config.rendered}"
    filename = "config.json"
  }

  source {
    content  = "${file("client_secret.json")}"
    filename = "client_secret.json"
  }
}

// Event Publisher archive
data "archive_file" "event_publisher" {
  type        = "zip"
  output_path = "${path.module}/dist/${var.event_publisher_function_name}.zip"

  source {
    content  = "${file("${path.module}/src/event-publisher/index.js")}"
    filename = "index.js"
  }

  source {
    content  = "${file("${path.module}/src/event-publisher/package.json")}"
    filename = "package.json"
  }

  source {
    content  = "${data.template_file.config.rendered}"
    filename = "config.json"
  }

  source {
    content  = "${file("client_secret.json")}"
    filename = "client_secret.json"
  }
}

// Redirect archive
data "archive_file" "redirect" {
  type        = "zip"
  output_path = "${path.module}/dist/${var.redirect_function_name}.zip"

  source {
    content  = "${file("${path.module}/src/redirect/index.js")}"
    filename = "index.js"
  }

  source {
    content  = "${file("${path.module}/src/redirect/package.json")}"
    filename = "package.json"
  }

  source {
    content  = "${file("${path.module}/src/messages.json")}"
    filename = "messages.json"
  }

  source {
    content  = "${data.template_file.config.rendered}"
    filename = "config.json"
  }

  source {
    content  = "${file("client_secret.json")}"
    filename = "client_secret.json"
  }
}

// Redirect archive
data "archive_file" "slash_command" {
  type        = "zip"
  output_path = "${path.module}/dist/${var.slash_command_function_name}.zip"

  source {
    content  = "${file("${path.module}/src/slash-command/index.js")}"
    filename = "index.js"
  }

  source {
    content  = "${file("${path.module}/src/slash-command/package.json")}"
    filename = "package.json"
  }

  source {
    content  = "${file("${path.module}/src/messages.json")}"
    filename = "messages.json"
  }

  source {
    content  = "${data.template_file.config.rendered}"
    filename = "config.json"
  }
}
