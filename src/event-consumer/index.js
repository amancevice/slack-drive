const clientSecret = require('./client_secret.json');
const config = require('./config.json');
const { WebClient } = require('@slack/client');
const { google } = require('googleapis');
const slack = new WebClient(config.slack.api_token);
const mimeTypeFolder = 'application/vnd.google-apps.folder';
const scopes = ['https://www.googleapis.com/auth/drive'];
const jwt = new google.auth.JWT(clientSecret.client_email, './client_secret.json', null, scopes);
const drive = google.drive({version: 'v3', auth: jwt});
const red = '#f83a22';
const prefix = 'https://drive.google.com/drive/u/0/folders/'

String.prototype.titlize = function() {
  return this.replace(/_/g, ' ').split(/ /).map((x) => {
    return `${x.slice(0, 1).toUpperCase()}${x.slice(1)}`;
  }).join(' ');
}

String.prototype.tickwrap = function() {
  return `\`\`\`${this}\`\`\``;
}

/**
 * Log PubSub message.
 *
 * @param {object} e      PubSub message.
 * @param {object} e.data Base64-encoded message data.
 */
function logEvent(e) {
  console.log(`PUBSUB MESSAGE ${JSON.stringify(e)}`);
  return e;
}

/**
 * Base64-decode PubSub message.
 *
 * @param {object} e      PubSub message.
 * @param {object} e.data Base64-encoded message data.
 */
function decodeEvent(e) {
  return JSON.parse(Buffer.from(e.data, 'base64').toString());
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
    .then(includeExclude)
    .then(findOrCreateFolder)
    .then(addPermission)
    .then(postDirect)
    .then(postMessage);
}

/**
 * Determine if event is a user-event.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function userEvent(e) {
  return e.event.type === 'member_joined_channel' ||
         e.event.type === 'member_left_channel';
}

/**
 * Determine if user is in exclude list.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function userExcluded(e) {
  return config.slack.users.excluded.indexOf(e.user.id) >= 0;
}

/**
 * Determine if user is in include list.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function userIncluded(e) {
  return config.slack.users.included.length === 0 ||
         config.slack.users.included.indexOf(e.user.id) >= 0;
}

/**
 * Determine if work is to be done.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function includeExclude(e) {
  if (!userEvent(e) || userExcluded(e) || !userIncluded(e)) {
    console.log(`USER NOT INCLUDED`);
    e.event.type = `${e.event.type} (Testing Only)`;
  }
  return e;
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
      })
      .catch((err) => {
        console.error(JSON.stringify(err));
        throw err;
      });

  // Get private channel info from Slack
  } else if (e.event.channel_type === 'G') {
    return slack.groups.info({channel: e.event.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.group.name}`);
        e.channel = res.group;
        return e;
      })
      .catch((err) => {
        console.error(JSON.stringify(err));
        throw err;
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
      })
      .catch((err) => {
        console.error(JSON.stringify(err));
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
              folderColorRgb: red,
              appProperties: {
                channel: e.channel.id
              }
            }
          })
          .then((res) => {
            e.folder = res.data;
            return e;
          })
          .catch((err) => {
            console.error(err);
            throw err;
          });

      // Return if folder exists
      } else {
        console.log(`FOUND FOLDER #${e.channel.name}`);
        res.data.files.map((x) => { e.folder = x; });
        return e;
      }
    })
    .catch((err) => {
      console.error(err);
      throw err;
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
    return drive.permissions.create({
        fileId: e.folder.id,
        sendNotificationEmail: false,
        resource: {
          role: 'writer',
          type: 'user',
          emailAddress: e.user.profile.email
        }
      })
      .then((res) => {
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
function postDirect(e) {

  // Member joined channel
  if (e.event.type === 'member_joined_channel') {

    // Build message
    if (e.folder !== undefined) {
      config.slack.messages.member_joined_channel.attachments[0].actions[0].url = `${prefix}${e.folder.id}`;
    }
    config.slack.messages.member_joined_channel.attachments[1].ts = e.event.event_ts;
    config.slack.messages.member_joined_channel.channel = e.channel.id;
    config.slack.messages.member_joined_channel.text = `:sparkles: Welcome to #${e.channel.name} :sparkles:`;
    config.slack.messages.member_joined_channel.user = e.user.id;

    // Post ephemeral message back to Slack
    return slack.chat.postEphemeral(config.slack.messages.member_joined_channel)
      .then((res) => {
        console.log(`EPHEMERAL RESPONSE ${JSON.stringify(res)}`);
        return e;
      });

  // Member left channel
  } else if (e.event.type === 'member_left_channel') {

    // Open DM
    return slack.im.open({user: e.user.id})
      .then((res) => {

        // Build message
        config.slack.messages.member_left_channel.attachments[0].ts = e.event.event_ts;
        config.slack.messages.member_left_channel.channel = res.channel.id;
        config.slack.messages.member_left_channel.text = `Goodbye from #${e.channel.name} :wave:`;

        // Post DM to user
        return slack.chat.postMessage(config.slack.messages.member_left_channel)
          .then((res) => {
            console.log(`DM RESPONSE ${JSON.stringify(res)}`);
            return e;
          })
          .catch((err) => {
            console.error(JSON.stringify(err));
            throw err;
          });
      })

  // No ephemeral message necessary
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
  config.slack.messages.success.channel = config.slack.app_channel;
  config.slack.messages.success.attachments.map((x) => {
    x.ts = e.event.event_ts;
    x.title = e.event.type.titlize();
    x.fields = [{short: true, title: 'Channel', value: `#${e.channel.name}`}];
    if (e.user) {
      x.fields.push({short: true, title: 'User', value: `@${e.user.profile.display_name}`})
    }
    x.fields.push({title: 'Event', value: JSON.stringify(e.event).tickwrap()});
  });

  // Post success message back to Slack
  return slack.chat.postMessage(config.slack.messages.success)
    .then((res) => {
      console.log(`MESSAGE RESPONSE ${JSON.stringify(res)}`);
      return e;
    })
    .catch((err) => {
      console.error(JSON.stringify(err));
      throw err;
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
  config.slack.messages.error = config.slack.app_channel;
  config.slack.messages.error.attachments.map((x) => {
    x.ts = new Date()/1000;
    x.fields = [
      {title: err.name, value: err.message},
      {title: 'Stacktrace', value: err.stack.tickwrap()},
      {title: 'Event', value: JSON.stringify(e).tickwrap()}
    ];
  });

  // Post error message back to Slack
  console.log('HERE!');
  return slack.chat.postMessage(config.slack.messages.error);
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
