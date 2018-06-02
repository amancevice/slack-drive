{
  "cloud": {
    "project_id": "${project}",
    "region": "${region}",
    "events_topic": "${events_pubsub_topic}",
    "redirect_function": "${redirect_function_name}"
  },
  "slack": {
    "web_api_token": "${web_api_token}",
    "verification_token": "${verification_token}",
    "channel": "${channel}",
    "color": "${color}",
    "slash_command": "${slash_command}",
    "users": {
      "excluded": [
        "USLACKBOT"
      ],
      "included": []
    }
  }
}
