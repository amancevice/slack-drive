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
 * Compose Slack message from error.
 *
 * @param {object} error Error object.
 */
function successMessage(message) {
  const msg = JSON.parse(JSON.stringify(config.slack.success_message_template));
  try {
    msg.attachments[0].fields[0].value = `\`\`\`${JSON.stringify(message)}\`\`\``;
    msg.attachments[0].ts = new Date()/1000;
  }
  catch(err) {
    msg.attachments = [
      {
        color: 'good',
        text: `\`\`\`\n${JSON.stringify(message)}\n\`\`\``,
        footer: 'Slack | Google Drive Sync',
        ts: new Date()/1000
      }
    ];
  }
  return msg;
}

/**
 *
 */
exports.consumeEvent = (event, callback) => {
  const pubSubMsg = pubSubMessage(event);
  const successMsg = successMessage(pubSubMsg.event);
  console.log(JSON.stringify(successMsg));
  publisher.publish(Buffer.from(JSON.stringify(successMsg)))
    .then((res) => {
      console.log(res);
    })
    .catch((err) => {
      console.error(err);
    });
  callback();
};
