const config = require('./config.json');
const { WebClient } = require('@slack/client');
const slack = new WebClient(config.slack.api_token);

const { google } = require('googleapis');
const clientSecret = require('./client_secret.json');
const mimeTypeFolder = 'application/vnd.google-apps.folder';
const jwt = new google.auth.JWT(
  clientSecret.client_email,
  '/etc/cloud/client_secret.json',
  null,
  ['https://www.googleapis.com/auth/drive']);
const drive = google.drive({version: 'v3', auth: jwt});

String.prototype.titlize = function() {
  return this.replace(/_/g, ' ').split(/ /).map((x) => {
    return `${x.slice(0, 1).toUpperCase()}${x.slice(1)}`;
  }).join(' ');
}

/**
 * Log PubSub message.
 *
 * @param {object} e      PubSub message.
 * @param {object} e.data Base64-encoded message data.
 */
function logEvent(e) {
  return Promise.resolve(e)
    .then((e) => {
      console.log(`PUBSUB MESSAGE ${JSON.stringify(e)}`);
      return e;
    });
}

/**
 * Base64-decode PubSub message.
 *
 * @param {object} e      PubSub message.
 * @param {object} e.data Base64-encoded message data.
 */
function decodeEvent(e) {
  return Promise.resolve(e)
    .then((e) => {
      return JSON.parse(Buffer.from(e.data, 'base64').toString());
    });
}

/**
 * Base64-decode PubSub message.
 *
 * @param {object} e      PubSub message.
 * @param {object} e.data Base64-encoded message data.
 */

/**
 * Get Slack channel info.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function getChannel(e) {
  // No need to call Slack if `channel` is already an object
  if (typeof e.event.channel == 'object') {
    e.channel = e.event.channel;
    return Promise.resolve(e);

  // Get channel info from Slack
  } else if (e.event.channel_type == 'C') {
    return slack.channels.info({channel: e.event.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.channel.name}`);
        e.channel = res.channel;
        return e;
      });

  // Get private channel info from Slack
  } else if (e.event.channel_type == 'G') {
    return slack.groups.info({channel: e.event.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.channel.name}`);
        e.channel = res.channel;
        return e;
      });
  }
}

/**
 * Get Slack user info.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function getUser(e) {
  // No need to get user info if no user in event
  if (e.event.user === undefined) {
    return Promise.resolve(e);

  // Get user info from Slack
  } else {
    return slack.users.info({user: e.event.user})
      .then((res) => {
        console.log(`USER @${res.user.profile.display_name}`);
        e.user = res.user;
        return e;
      });
  }
}

/**
 * Post ephemeral message back to the user with info about Google Drive.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function postEphemeral(e) {
  // Build message
  config.slack.success_message.attachments.map((x) => {
    x.ts = e.event.event_ts;
    x.title = e.event.type.titlize();
    x.fields = [{short: true, title: 'Channel', value: `#${e.channel.name}`}];
    if (e.user) {
      x.fields.push({short: true, title: 'User', value: `@${e.user.profile.display_name}`})
    }
    x.fields.push({title: 'Event', value:`\`\`\`${JSON.stringify(e.event)}\`\`\``});
  });

  // Post ephemeral message back to Slack
  return slack.chat.postEphemeral(config.slack.ephemeral_message)
    .then((res) => {
      console.log(`EPHEMERAL RESPONSE ${JSON.stringify(res)}`);
      return e;
    });
}

/**
 * Post success message to Slack
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function postMessage(e) {
  // Build message
  config.slack.success_message.attachments.map((x) => {
    x.ts = e.event.event_ts;
    x.title = e.event.type.titlize();
    x.fields = [{short: true, title: 'Channel', value: `#${e.channel.name}`}];
    if (e.user) {
      x.fields.push({short: true, title: 'User', value: `@${e.user.profile.display_name}`})
    }
    x.fields.push({title: 'Event', value:`\`\`\`${JSON.stringify(e.event)}\`\`\``});
  });

  // Post success message back to Slack
  return slack.chat.postMessage(config.slack.success_message);
}

/**
 * Post error message to Slack.
 *
 * @param {object} err Error.
 * @param {object} e Slack event object.
 */
function postError(err, e) {
  // Build message
  config.slack.error_message.attachments.map((x) => {
    x.ts = new Date()/1000;
    x.fields = [
      {title: err.name, value: err.message},
      {title: 'Stacktrace', value: `\`\`\`${err.stack}\`\`\``},
      {title: 'Event', value: `\`\`\`${JSON.stringify(e)}\`\`\``}
    ];
  });

  // Post error message back to Slack
  return slack.chat.postMessage(config.slack.error_message);
}

/**
 *
 */
exports.consumeEvent = (event, callback) => {
  Promise.resolve(event.data)
    .then(logEvent)
    .then(decodeEvent)
    .then(getChannel)
    .then(getUser)
    // Do something in Drive here...
    .then(postEphemeral)
    .then(postMessage)
    .catch((err) => postError(err, e));

  callback();
};
