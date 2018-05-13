const { WebClient } = require('@slack/client');
const { google } = require('googleapis');
const config = require('./config.json');
const clientSecret = require('/etc/cloud/client_secret.json');
const mimeTypeFolder = 'application/vnd.google-apps.folder';
const slack = new WebClient(config.slack.api_token);
const jwt = new google.auth.JWT(
  clientSecret.client_email,
  '/etc/cloud/client_secret.json',
  null,
  ['https://www.googleapis.com/auth/drive']);
const drive = google.drive({version: 'v3', auth: jwt});

/**
 * Unhandled request or event type.
 */
class UnhandledRequest extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnhandledRequest';
    this.code = 501;
  }
}

/**
 * Compose Slack message from error.
 *
 * @param {object} error Error object.
 */
function slackErrorMessage(error) {
  let msg = JSON.parse(JSON.stringify(config.slack.message_template));
  try {
    msg.attachments[0].fields[0].value = error.name;
    msg.attachments[0].fields[1].value = error.message;
    msg.attachments[0].fields[2].value = `\`\`\`\n${error.stack}\n\`\`\``;
    msg.attachments[0].ts = new Date()/1000;
  }
  catch(err) {
    msg.attachments = [
      {
        color: 'danger',
        text: `\`\`\`\n${error}\n\`\`\``,
        footer: 'Slack | Google Drive Sync',
        ts: new Date()/1000
      }
    ];
  }
  return msg;
}

/**
 * Compose Slack message from error.
 *
 * @param {object} error Error object.
 */
function postErrorMessage(error) {
  slack.chat.postMessage(slackErrorMessage(error))
    .then((res) => {
      // Return rejection of original error
      return Promise.reject(error);
    })
    .catch((err) => {
      // Return rejection of the error to post to Slack
      return Promise.reject(err);
    });
}

/**
 * Parse Base64-encoded PubSub message.
 *
 * @param {object} message           PubSub message.
 * @param {object} message.data      PubSub message data.
 * @param {object} message.data.data Base64-encoded message data.
 */
function parsePubSubMessage(message) {
  try {
    let encodedEvent = Buffer.from(message.data.data, 'base64').toString();
    return JSON.parse(encodedEvent);
  }
  catch(err) {
    console.error(err);
    throw new PubSubError('Could not parse Pub/Sub message');
  }
}

/**
 * Handle channel_created
 *
 * @param {object}  slackEvent                         The Slack event object
 * @param {string}  slackEvent.type                    Event type
 * @param {object}  slackEvent.channel                 Channel object
 * @param {string}  slackEvent.channel.id              Channel ID
 * @param {boolean} slackEvent.channel.is_channel      Is channel
 * @param {string}  slackEvent.channel.name            Channel name
 * @param {string}  slackEvent.channel.name_normalized Normalized channel name
 * @param {number}  slackEvent.channel.created         Created timestamp
 * @param {string}  slackEvent.event_ts                Event timestamp
 */
function handleChannelCreated(slackEvent) {
  drive.files.list({
    pageSize: 100,
    fields: 'nextPageToken, files(id, name)',
    q: `name = 'Channel' and mimeType = '${mimeTypeFolder}'`
  }, (err, {data}) => {
    if (err) throw err;
    data.files.map((file) => {
      console.log(`${file.name} :: ${file.id}`);
    });
  });
}

/**
 * Handle channel_rename
 *
 * @param {object}  slackEvent                         The Slack event object
 * @param {string}  slackEvent.type                    Event type
 * @param {object}  slackEvent.channel                 Channel object
 * @param {string}  slackEvent.channel.id              Channel ID
 * @param {boolean} slackEvent.channel.is_channel      Is channel
 * @param {string}  slackEvent.channel.name            Channel name
 * @param {string}  slackEvent.channel.name_normalized Normalized channel name
 * @param {number}  slackEvent.channel.created         Created timestamp
 * @param {string}  slackEvent.event_ts                Event timestamp
 */
function handleChannelRename(slackEvent) {
  console.log(slackEvent);
}

/**
 * Handle group_rename
 *
 * @param {object}  slackEvent                         The Slack event object
 * @param {string}  slackEvent.type                    Event type
 * @param {object}  slackEvent.channel                 Channel object
 * @param {string}  slackEvent.channel.id              Channel ID
 * @param {boolean} slackEvent.channel.is_channel      Is channel
 * @param {string}  slackEvent.channel.name            Channel name
 * @param {string}  slackEvent.channel.name_normalized Normalized channel name
 * @param {number}  slackEvent.channel.created         Created timestamp
 * @param {string}  slackEvent.event_ts                Event timestamp
 */
function handleGroupRename(slackEvent) {
  console.log(slackEvent);
}

/**
 * Handle member_left_channel
 *
 * @param {object} slackEvent              The Slack event object
 * @param {string} slackEvent.type         Event type
 * @param {string} slackEvent.user
 * @param {string} slackEvent.channel
 * @param {string} slackEvent.channel_type Channel type
 * @param {string} slackEvent.team
 * @param {string} slackEvent.event_ts
 */
function handleMemberLeftChannel(slackEvent) {
  console.log(slackEvent);
}

/**
 * Handle member_joined_channel
 *
 * @param {object} slackEvent              The Slack event object
 * @param {string} slackEvent.type         Event type
 * @param {string} slackEvent.user
 * @param {string} slackEvent.channel
 * @param {string} slackEvent.channel_type Channel type
 * @param {string} slackEvent.team
 * @param {string} slackEvent.inviter
 * @param {string} slackEvent.event_ts
 */
function handleMemberJoinedChannel(slackEvent) {
  console.log(slackEvent);
}

/**
 * Handle team_join
 *
 * @param {object} slackEvent      The Slack event object
 * @param {string} slackEvent.type Event type
 * @param {object} slackEvent.user User object
 */
function handleTeamJoin(slackEvent) {
  console.log(slackEvent);
}

/**
 * Background Cloud Function to be triggered by Pub/Sub.
 *
 * @param {object}   event    The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.consumeEvent = (message, callback) => {
  // Parse event JSON
  let slackEvent = parsePubSubMessage(message);

  // Log event
  console.log(`Consuming ${JSON.stringify(slackEvent)}`);

  // Handle Slack event
  try {
    {
      channel_created: handleChannelCreated,
      channel_rename: handleChannelRename,
      group_rename: handleGroupRename,
      member_left_channel: handleMemberLeftChannel,
      member_joined_channel: handleMemberJoinedChannel,
      team_join: handleTeamJoin,
    }[slackEvent.type](slackEvent);
  }
  catch(e) {
    throw new UnhandledRequest('Unhandled event type');
  }

  callback();
};
