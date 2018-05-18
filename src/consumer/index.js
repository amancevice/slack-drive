const PubSub = require('@google-cloud/pubsub');
const config = require('./config.json');
const pubsub = new PubSub({
  projectId: config.cloud.project_id,
  keyFilename: './client_secret.json'
});
const publisher = pubsub.topic(config.cloud.pubsub_topic).publisher();

const { google } = require('googleapis');
const clientSecret = require('./client_secret.json');
const mimeTypeFolder = 'application/vnd.google-apps.folder';
const jwt = new google.auth.JWT(
  clientSecret.client_email,
  '/etc/cloud/client_secret.json',
  null,
  ['https://www.googleapis.com/auth/drive']);
const drive = google.drive({version: 'v3', auth: jwt});

const { WebClient } = require('@slack/client');
const slack = new WebClient(config.slack.api_token);

String.prototype.titlize = function() {
  return this.replace(/_/g, ' ').split(/ /).map((x) => {
    return `${x.slice(0, 1).toUpperCase()}${x.slice(1)}`;
  }).join(' ');
}

/**
 * Base64-decode PubSub message.
 *
 * @param {object} event           Cloud Functions event.
 * @param {object} event.data      PubSub message.
 * @param {object} event.data.data Base64-encoded message data.
 */
function decodeEvent(event) {
  return new Promise((resolve, reject) => {
    try {
      resolve(JSON.parse(Buffer.from(event.data.data, 'base64').toString()));
    } catch(err) {
      reject(err);
    }
  });
}

function getChannel(event) {
  // No need to call Slack if `channel` is already an object
  if (typeof event.event.channel == 'object') {
    event.channel = event.event.channel;
    return Promise.resolve(event);

  // Get channel info from Slack
  } else if (event.event.channel_type == 'C') {
    return slack.channels.info({channel: event.event.channel})
      .then((res) => {
        console.log(`#${res.channel.name}`);
        event.channel = res.channel;
        return event;
      })
      .catch((err) => {
        console.error(err);
        err.event = event.event;
        throw err;
      });

  // Get private channel info from Slack
  } else if (event.event.channel_type == 'G') {
    return slack.groups.info({channel: event.event.channel})
      .then((res) => {
        console.log(`#${res.channel.name}`);
        event.channel = res.channel;
        return event;
      })
      .catch((err) => {
        console.error(err);
        err.event = event.event;
        throw err;
      });
  }
}

function getUser(event) {
  // No need to get user info if no user in event
  if (event.event.user === undefined) {
    return Promise.resolve(event);

  // Get user info from Slack
  } else {
    return slack.users.info({user: event.event.user})
      .then((res) => {
        console.log(`@${res.user.profile.display_name}`);
        event.user = res.user;
        return event;
      })
      .catch((err) => {
        console.error(err);
        err.event = event.event;
        throw err;
      })
  }
}

function publishEvent(event) {
  // Build message
  config.slack.success_message.attachments.map((x) => {
    x.ts = event.event.event_ts;
    x.title = event.event.type.titlize();
    x.fields = [{short: true, title: 'Channel', value: `#${event.channel.name}`}];
    if (event.user) {
      x.fields.push({short: true, title: 'User', value: `@${event.user.profile.display_name}`})
    }
    x.fields.push({title: 'Event', value:`\`\`\`${JSON.stringify(event.event)}\`\`\``});
  });

  // Publish response to PubSub topic for posting back to Slack
  console.log(JSON.stringify(config.slack.success_message));
  return publisher.publish(Buffer.from(JSON.stringify({
      method: 'postMessage',
      message: config.slack.success_message
    })))
    .then((res) => {
      console.log({messageId: res});
      event.pubsubId = {messageId: res};
      return event;
    })
    .catch((err) => {
      console.error(err);
      err.event = event;
      throw err;
    });
}

function publishError(err) {
  // Build message
  config.slack.error_message.attachments.map((x) => {
    x.ts = new Date()/1000;
    x.fields = [
      {title: err.name, value: err.message},
      {title: 'Stacktrace', value: `\`\`\`${err.stack}\`\`\``},
      {title: 'Event', value: `\`\`\`${JSON.stringify(err.event)}\`\`\``}
    ];
  });

  // Publish response to PubSub topic for posting back to Slack
  console.log(JSON.stringify(config.slack.success_message));
  return publisher.publish(Buffer.from(JSON.stringify({
      method: 'postMessage',
      message: config.slack.error_message
    })))
    .catch(console.error(err));
}

/**
 *
 */
exports.consumeEvent = (event, callback) => {
  Promise.resolve(event)
    .then(decodeEvent)
    .then(getChannel)
    .then(getUser)
    .then(publishEvent)
    .catch(publishError);

  callback();
};
