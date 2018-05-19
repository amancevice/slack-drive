const clientSecret = require('./client_secret.json');
const config = require('./config.json');
const { WebClient } = require('@slack/client');
const { google } = require('googleapis');
const slack = new WebClient(config.slack.api_token);
const mimeTypeFolder = 'application/vnd.google-apps.folder';
const jwt = new google.auth.JWT(
  clientSecret.client_email,
  './client_secret.json',
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
 * Determine if work is to be done.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function processEvent(e) {
  return Promise.resolve(e)
    .then(getChannel)
    .then(getUser)
    .then(findOrCreateFolder)
    .then(addPermission)
    .then(postEphemeral)
    .then(postMessage);
}

/**
 * Get Slack channel info.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function getChannel(e) {
  // No need to call Slack if `channel` is already an object
  if (typeof e.event.channel === 'object') {
    e.channel = e.event.channel;
    return Promise.resolve(e);

  // Get channel info from Slack
  } else if (e.event.channel_type === 'C') {
    return slack.channels.info({channel: e.event.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.channel.name}`);
        e.channel = res.channel;
        return e;
      });

  // Get private channel info from Slack
  } else if (e.event.channel_type === 'G') {
    return slack.groups.info({channel: e.event.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.group.name}`);
        e.channel = res.group;
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
 * Create folder in Drive if none exists.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function findOrCreateFolder(e) {
  // Search for folder by channel ID in `appProperties`
  return drive.files.list({
      q: `appProperties has { key='channel' and value='${e.channel.id}' }`
    })
    .then((res) => {

      // Create folder and return
      if (res.data.files.length === 0) {
        console.log(`CREATING FOLDER #${e.channel.name}`);
        return drive.files.create({
            resource: {
              name: `#${e.channel.name}`,
              mimeType: mimeTypeFolder,
              appProperties: {
                channel: e.channel.id
              }
            }
          })
          .then((res) => {
            e.folder = res.data;
            return e;
          });

      // Return if folder exists
      } else {
        console.log(`FOUND FOLDER #${e.channel.name}`);
        res.data.files.map((x) => { e.folder = x; });
        return e;
      }
    });
}

/**
 * Create folder in Drive if none exists.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function addPermission(e) {
  // Grant permission
  if (e.event.type === 'member_joined_channel') {
    e.user.profile.email = 'alexander.mancevice@gmail.com'; // TODO remove this!
    return drive.permissions.create({
        fileId: e.folder.id,
        sendNotificationEmail: false,
        resource: {
          role: 'writer',
          type: 'user',
          emailAddress: e.user.profile.email
        }
      }).then((res) => {
        console.log(`GRANTED ${JSON.stringify(res.data)}`);
        e.permission = res.data;
        return e;
      });
  } else {
    return Promise.resolve(e);
  }
}

/**
 * Post ephemeral message back to the user with info about Google Drive.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function postEphemeral(e) {
  if (e.event.type === 'member_joined_channel') {
    // Build message
    config.slack.member_joined_channel.text = `:sparkles: Welcome to #${e.channel.name} :sparkles:`;
    config.slack.member_joined_channel.channel = e.channel.id;
    config.slack.member_joined_channel.user = e.user.id;
    config.slack.member_joined_channel.attachments.slice(0, 1).map((a) => {
      a.actions.map((b) => {
        b.url = `https://drive.google.com/drive/u/0/folders/${e.folder.id}`
      });
    });
    config.slack.member_joined_channel.channel = 'GAK9Z9ULV'; // TODO remove this!
    config.slack.member_joined_channel.user = 'U7P1MU20P'; // TODO remove this!

    // Post ephemeral message back to Slack
    return slack.chat.postEphemeral(config.slack.member_joined_channel)
      .then((res) => {
        console.log(`EPHEMERAL RESPONSE ${JSON.stringify(res)}`);
        return e;
      });
  } else if (e.event.type === 'member_left_channel') {
    // Open DM
    e.user.id = 'U7P1MU20P'; // TODO remove this!
    return slack.im.open({user: e.user.id})
      .then((res) => {
        console.log()
        config.slack.member_left_channel.channel = res.channel.id;
        config.slack.member_left_channel.text = `Goodbye from #${e.channel.name} :wave:`;
        return slack.chat.postMessage(config.slack.member_left_channel)
          .then((res) => {
            console.log(`DM RESPONSE ${JSON.stringify(res)}`);
            return e;
          });
      })
  } else {
    return Promise.resolve(e);
  }
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
  return slack.chat.postMessage(config.slack.success_message)
  .then((res) => {
    console.log(`MESSAGE RESPONSE ${JSON.stringify(res)}`);
    return e;
  });
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
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} callback The callback function.
 */
exports.consumeEvent = (event, callback) => {
  Promise.resolve(event.data)
    .then(logEvent)
    .then(decodeEvent)
    .then(processEvent)
    .catch((err) => postError(err, event.data));

  callback();
};
