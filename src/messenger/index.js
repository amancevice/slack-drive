const { WebClient } = require('@slack/client');
const config = require('./config.json');
const slack = new WebClient(config.slack.api_token);

/**
 *
 */
function errorMessage(err, event) {
  const msg = JSON.parse(JSON.stringify(config.slack.error_message_template));
  try {
    msg.attachments[0].ts = new Date()/1000;
    msg.attachments[0].fields = [
      {title: err.name, value: err.message},
      {title: 'Stacktrace', value: `\`\`\`\n${err.stack}\n\`\`\``},
      {title: 'Event', value: `\`\`\`\n${JSON.stringify(event)}\n\`\`\``}
    ];
  }
  catch(err) {
    msg.attachments = [
      {
        color: 'danger',
        fields: [
          {title: 'Error', value: `\`\`\`\n${err}\n\`\`\``},
          {title: 'Event', value: `\`\`\`\n${JSON.stringify(event)}\n\`\`\``}
        ],
        footer: 'Slack | Google Drive Sync',
        ts: new Date()/1000
      }
    ];
  }
  return msg;
}

/**
 * Post message to Slack.
 *
 * @param {object} msg Slack message object.
 * @param {string} msg.channel Slack channel ID.
 * @param {string} msg.text Slack message text.
 * @param {array} msg.attachments Slack message attachments.
 */
function postMessage(msg) {
  slack.chat.postMessage(msg)
    .then((res) => console.log)
    .catch((err) => console.error);
}

/**
 * Parse Base64-encoded PubSub message.
 *
 * @param {object} event           Cloud Functions event.
 * @param {object} event.data      PubSub message.
 * @param {object} event.data.data Base64-encoded message data.
 */
function pubSubMessage(event) {
  return JSON.parse(Buffer.from(event.data.data, 'base64').toString());
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {object} event Cloud Functions event.
 * @param {function} callback Callback function.
 */
exports.subscribe = (event, callback) => {
  try {
    postMessage(pubSubMessage(event));
  }
  catch(err) {
    postMessage(errorMessage(err, event));
  }
  finally {
    callback();
  }
}
