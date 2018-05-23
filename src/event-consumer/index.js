// App
const config = require('./config.json');
const messages = require('./messages.json');

// Slack
const { WebClient } = require('@slack/client');
const slack = new WebClient(config.slack.web_api_token);

// Google Drive
const service = require('./client_secret.json');
const { google } = require('googleapis');
const mimeTypeFolder = 'application/vnd.google-apps.folder';
const scopes = ['https://www.googleapis.com/auth/drive'];
const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
const drive = google.drive({version: 'v3', auth: jwt});
const red = '#f83a22';
const prefix = 'https://drive.google.com/drive/u/0/folders/';

Object.prototype.interpolate = function(mapping) {
  let that = JSON.parse(JSON.stringify(this));
  Object.keys(mapping).map((k) => {
    that = JSON.parse(JSON.stringify(that)
      .replace(new RegExp(`\\$\\{${k}\\}`, 'g'), mapping[k]));
  });
  return that;
}

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
 * Determine if event is a user-event.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function userEvent(e) {
  return e.event.type === 'member_joined_channel' ||
         e.event.type === 'member_left_channel' ||
         e.event.type === 'slash_command';
}

/**
 * Determine if user is permitted to use this service.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function userPermitted(e) {
  return config.slack.users.excluded.indexOf(e.event.user) < 0 && // *not* excluded
        (config.slack.users.included.length === 0 ||              // no includes
         config.slack.users.included.indexOf(e.event.user) >= 0); // explicit include
}

/**
 * Get Slack team info.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function getTeam(e) {

  return slack.team.info({team: e.team_id})
    .then((res) => {
      console.log(`TEAM #${res.team.domain}`);
      e.team = res.team;
      return e;
    })
    .catch((err) => {
      console.error(JSON.stringify(err));
      throw err;
    });
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
  }

  // Get channel info from Slack
  else if (e.event.channel_type === 'C') {
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
  }

  // Get private channel info from Slack
  else if (e.event.channel_type === 'G') {
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

  throw new Error('Unknown channel_type');
}

/**
 * Get Slack user info.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function getUser(e) {

  // No need to get user info if no user in event
  if (e.event.user === undefined) return Promise.resolve(e);

  // Get user info from Slack
  return slack.users.info({user: e.event.user})
    .then((res) => {
      console.log(`USER @${res.user.profile.display_name}`);
      e.user = res.user;
      return e;
    })
    .catch((err) => {
      console.error(JSON.stringify(err));
      throw err;
    });
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
      }

      // Return if folder exists
      console.log(`FOUND FOLDER #${e.channel.name}`);
      res.data.files.map((x) => { e.folder = x; });
      return e;
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
  if (e.event.type === 'member_joined_channel' ||
      e.event.type === 'slash_command') {
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
  }

  return Promise.resolve(e);
}

/**
 * Post ephemeral message back to the user with info about Google Drive.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function postResponse(e) {

  // Build message
  const response = messages.responses[e.event.type].interpolate({
    channel: e.event.channel_type === 'C' ? `<#${e.channel.id}>` : `#${e.channel.name}`,
    cmd: config.slack.slash_command,
    color: config.app.color,
    team: e.team.domain,
    ts: e.event.event_ts,
    url: `${prefix}${e.folder.id}`
  });

  // Member joined channel
  if (e.event.type === 'member_joined_channel') {

    // Route message
    response.channel = e.channel.id;
    response.user = e.user.id;

    // Post ephemeral message
    console.log('POSTING EPHEMERAL RESPONSE');
    return slack.chat.postEphemeral(response).then((res) => { return e; });
  }

  // Member left channel
  else if (e.event.type === 'member_left_channel') {

    // Open DM
    return slack.im.open({user: e.user.id})
      .then((res) => {

        // Route message
        response.channel = res.channel.id;

        // Post DM to user
        console.log('POSTING DIRECT RESPONSE');
        return slack.chat.postMessage(response).then((res) => { return e; });
      })
  }

  // No ephemeral message necessary
  return Promise.resolve(e);
}

/**
 * Post success message to Slack
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function postRecord(e) {

  // Build message
  const record = messages.records.success.interpolate({
    channel: e.channel.name,
    cmd: config.slack.slash_command,
    event: JSON.stringify(e.event).replace(/"/g, '\\"').tickwrap(),
    title: e.event.type.titlize(),
    ts: e.event.event_ts,
    user: e.user.profile.display_name
  });
  record.channel = config.app.channel;

  // Post record message
  console.log('POSTING RECORD');
  return slack.chat.postMessage(record)
    .then((res) => { return e; })
    .catch((err) => { console.error(JSON.stringify(err)); throw err; });
}

/**
 * Post error message to Slack.
 *
 * @param {object} err Error.
 * @param {object} e Slack event object.
 */
function postError(err, e) {
  // Build message
  const error = messages.records.error.interpolate({
    error_message: err.message,
    error_name: err.name,
    event: JSON.stringify(e).replace(/"/g, '\\"').tickwrap(),
    stack: err.stack.replace(/\n/g, '\\n').tickwrap(),
    ts: new Date()/1000
  });
  error.channel = config.app.channel;

  // Post error message back to Slack
  slack.chat.postMessage(error);

  throw err;
}

/**
 * Determine if work is to be done.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function processEvent(e) {
  // User event & user is permitted to invoke event
  if (userEvent(e) && userPermitted(e)) {
    return Promise.resolve(e)
      .then(getUser)
      .then(findOrCreateFolder)
      .then(addPermission)
      .then(postResponse);
  }

  // User event, but user is not permitted to evoke event
  else if (userEvent(e)) {
    e.event.type = `${e.event.type} (Testing Only)`
    return Promise.resolve(e).then(getUser);
  }

  return Promise.resolve(e);
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
    .then(getTeam)
    .then(getChannel)
    .then(processEvent)
    .then(postRecord)
    .catch((err) => postError(err, event.data));

  callback();
};
