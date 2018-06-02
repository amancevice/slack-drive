provider "archive" {
  version = "~> 1.0"
}

provider "template" {
  version = "~> 1.0"
}

// Event Consumer archive
data "archive_file" "event_consumer" {
  type        = "zip"
  output_path = "${path.module}/dist/event-consumer.zip"

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
    content  = "${var.config}"
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
  output_path = "${path.module}/dist/event-publisher.zip"

  source {
    content  = "${file("${path.module}/src/event-publisher/index.js")}"
    filename = "index.js"
  }

  source {
    content  = "${file("${path.module}/src/event-publisher/package.json")}"
    filename = "package.json"
  }

  source {
    content  = "${var.config}"
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
  output_path = "${path.module}/dist/redirect.zip"

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
    content  = "${var.config}"
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
  output_path = "${path.module}/dist/slash-command.zip"

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
    content  = "${var.config}"
    filename = "config.json"
  }
}
