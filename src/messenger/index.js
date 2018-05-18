const { WebClient } = require('@slack/client');
const config = require('./config.json');
const slack = new WebClient(config.slack.api_token);

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

/**
 * Post message to Slack.
 *
 * @param {object} event Slack message payload.
 * @param {object} event.method Slack chat method (postMessage/postEphemeral).
 * @param {object} event.message Slack message object.
 */
function postMessage(event) {
  console.log(event);
  return slack.chat[event.method](event.message)
    .then(console.log)
    .catch((err) => {
      console.error(err);
      err.event = event
      throw err;
    });
}

/**
 * Post message to Slack.
 *
 * @param {object} err Error object.
 * @param {string} err.name Error name.
 * @param {string} err.message Error message.
 * @param {string} err.stack Error stacktrace.
 * @param {object} err.event Event that threw error.
 */
function postError(err) {
  config.slack.error_message.attachments.map((x) => {
    x.ts = new Date()/1000;
    x.fields = [
      {title: err.name, value: err.message},
      {title: 'Stacktrace', value: `\`\`\`${err.stack}\`\`\``},
      {title: 'Event', value: `\`\`\`${JSON.stringify(err.event)}\`\`\``}
    ];
  });
  return slack.chat.postMessage(config.slack.error_message).catch(console.error);
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {object} event Cloud Functions event.
 * @param {function} callback Callback function.
 */
exports.subscribe = (event, callback) => {
  Promise.resolve(event)
    .then(decodeEvent)
    .then(postMessage)
    .catch(postError);
  callback();
}
