# Slack Drive

<img src="https://github.com/amancevice/slack-drive/raw/master/docs/images/slack-drive-800x800.png" width=200 height=200></img>

Create & share Google Docs using Slack channels and Google Drive.

## Architecture

<img src="https://github.com/amancevice/slack-drive/raw/master/docs/images/arch.png" width=500></img>


This application makes use of “serverless” architecture to interact with a Slack bot through Slack’s Web & Events API using slash commands and event subscriptions. In toto, four cloud functions comprise the application’s core functionality: three HTTP endpoints and one subscription-based event processor.

Google Cloud is a natural back-end for this application and this document is written with that assumption, but there is no reason the concepts cannot be applied to another back-end, like AWS.

### Events

Slack Drive listens for four event types issued from Slack’s Event API:
* `channel_rename` and `group_rename` are sent when a user renames a channel (including private channels)
* `member_joined_channel` when a member joins a channel
* `member_left_channel` when a member leaves a channel

Slack events are handled using an HTTP endpoint and a subscription-based events processor. Slack imposes a three-second time limit for responses to requests made by Slack. Because of limitations inherent to the “serverless” pattern (where “cold start” time of applications is a factor) events received are handed off to a queue that can be consumed by an external process. In other words, the concerns of responding to Slack events and processing said event are separated into two distinct Cloud Functions.

The code providing the HTTP endpoint simply publishes the event to a Pub/Sub topic (similar to SNS in Amazon lingo) after verifying that the request was received with the correct validation token. Messages to Pub/Sub are Base64-encoded JSON strings of the Slack event as they are transmitted by the Events API.

Publishing to a Pub/Sub topic triggers a subscribed Cloud Function to process the event without regard for HTTP latencies or cold start time. Members joining a channel are processed by searching-for or creating a folder in Google Drive with the equivalent channel name, and adding the user to the list of collaborators for that folder. Channel or group renames trigger an update to rename the corresponding folder in Google Drive. Members leaving the channel are removed from the list of collaborators for the folder and , hence, lose access to its contents (Note: this feature has not yet been implemented as the permissions on a Google Drive folder cannot be retrieved by email).

### Slash Commands

In addition to listening for events, a user may trigger the workflow to access a channel’s folder in Google Drive using Slack’s slash commands feature. Slack also imposes a three-second time limit on responses to user-initiated slash commands, so like the event listener Cloud Function, the slash command code is minimal and handles no responsibilities other than responding to the user. The name of your slash command is configurable, but the default is `/drive`.

Typing `/drive` or `/drive help` from a given channel will send an ephemeral message to the user with instructions on how to use the tool.

Typing `/drive link` will send an ephemeral message to the user with a link to the channel’s folder in Google Drive. Because of the aforementioned three-second rule the link to Google Drive is routed through a different Cloud Function that grants access to the requesting user in real-time, but without a strict time limit. Like the event consumer Cloud Function, the process of redirecting the user is done by searching-for or creating the channel’s folder in Google Drive, adding the Slack user as a collaborator by email, and finally redirecting the request to the given Google Drive URL. The redirection HTTP endpoint accepts the query parameters `channel` and `user`. The given user must be a member of the given channel at the time of the request for the redirection to succeed.
