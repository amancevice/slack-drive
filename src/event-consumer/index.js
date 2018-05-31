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

// Firebase
const firebase = require('firebase-admin');
firebase.initializeApp({
  credential: firebase.credential.cert(service),
  databaseURL: `https://${config.cloud.project_id}.firebaseio.com`
});

// Lazy globals
let team, channel, user, folder, permission, response, record;

/**
 * Interpolate ${values} in a JSON object and replace with a given mapping.
 *
 * @param {object} object The object to interpolate.
 * @param {object} mapping The object mapping values to replace.
 */
function interpolate(object, mapping) {
  let that = JSON.parse(JSON.stringify(object));
  Object.keys(mapping).map((k) => {
    that = JSON.parse(JSON.stringify(that)
      .replace(new RegExp(`\\$\\{${k}\\}`, 'g'), mapping[k]));
  });
  return that;
}

/**
 * Transform a `snake_case` string to `Title Case`
 *
 * @param {string} str The string to titleize
 */
function titlize(str) {
  return str.replace(/_/g, ' ').split(/ /).map((x) => {
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
         e.event.type === 'member_left_channel';
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
      console.log(`TEAM ${res.team.domain}`);
      team = res.team;
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
    channel = e.event.channel;
    return Promise.resolve(e);
  }

  // Get channel info from Slack
  else if (e.event.channel_type === 'C') {
    return slack.channels.info({channel: e.event.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.channel.name}`);
        channel = res.channel;
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
        channel = res.group;
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
      console.log(`USER @${res.user.name}`);
      user = res.user;
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
      q: `appProperties has { key='channel' and value='${channel.id}' }`
    })
    .then((res) => {

      // Create folder and return
      if (res.data.files.length === 0) {
        console.log(`CREATING FOLDER #${channel.name}`);
        return drive.files.create({
            resource: {
              name: `#${channel.name}`,
              mimeType: mimeTypeFolder,
              folderColorRgb: red,
              appProperties: {
                channel: channel.id
              }
            }
          })
          .then((res) => {
            folder = res.data;
            return e;
          })
          .catch((err) => {
            console.error(err);
            throw err;
          });
      }

      // Return if folder exists
      console.log(`FOUND FOLDER #${channel.name}`);
      res.data.files.map((x) => { folder = x; });
      return e;
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

/**
 * Add permission to access folder in Google Drive.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function addPermission(e) {
  // Grant permission (ignoring bot users)
  if (!user.is_bot && e.event.type === 'member_joined_channel') {
    return drive.permissions.create({
        fileId: folder.id,
        sendNotificationEmail: false,
        resource: {
          role: 'writer',
          type: 'user',
          emailAddress: user.profile.email
        }
      })
      .then((res) => {
        console.log(`GRANTED ${JSON.stringify(res.data)}`);
        permission = res.data;
        return e;
      });
  }

  return Promise.resolve(e);
}

/**
 * Record permission info in Realtime database
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function recordPermission(e) {
  return firebase.database()
    .ref(`slack-drive/permissions/${channel.id}/${user.id}`)
    .set(permission)
    .then(() => {
      console.log(`RECORDED ${JSON.stringify(permission)}`);
      return e;
    });
}

/**
 * Add permission to access folder in Google Drive.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function findPermission(e) {
  return firebase.database()
    .ref(`slack-drive/permissions/${channel.id}/${user.id}`)
    .once('value')
    .then((snapshot) => {
      permission = snapshot.val();
      console.log(`FOUND ${JSON.stringify(permission)}`);
      return e;
    });
}

/**
 * Revoke permission to access folder in Google Drive.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function revokePermission(e) {
  return drive.permissions.delete({
      fileId: folder.id,
      permissionId: permission.id
    })
    .then((res) => {
      console.log(`REVOKED ${permission.id}`);
      return e;
    });
}

/**
 * Remove permission from Realtime database.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function removePermission(e) {
  return firebase.database()
    .ref(`slack-drive/permissions/${channel.id}/${user.id}`)
    .remove()
    .then(() => {
      console.log(`REMOVED ${permission.id}`);
      return e;
    });
}

/**
 * Rename a Google Drive folder
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function renameOrCreateFolder(e) {
  // Search for folder by channel ID in `appProperties`
  return drive.files.list({
      q: `appProperties has { key='channel' and value='${channel.id}' }`
    })
    .then((res) => {

      // Create folder and return
      if (res.data.files.length === 0) {
        console.log(`CREATING FOLDER #${channel.name}`);
        return drive.files.create({
            resource: {
              name: `#${channel.name}`,
              mimeType: mimeTypeFolder,
              folderColorRgb: red,
              appProperties: {
                channel: channel.id
              }
            }
          })
          .then((res) => {
            folder = res.data;
            return e;
          })
          .catch((err) => {
            console.error(err);
            throw err;
          });
      }

      // Rename folder
      res.data.files.map((x) => { folder = x; });
      console.log(`RENAMING FOLDER ${folder.name} => #${channel.name}`);
      return drive.files.update({
          fileId: folder.id,
          resource: {
            name: `#${channel.name}`
          }
        })
        .then((res) => {
          folder = res.data;
          return e;
        })
        .catch((err) => {
          console.error(err);
          throw err;
        });;
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

/**
 * Post ephemeral message back to the user with info about Google Drive.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function postResponse(e) {

  // Build message
  response = interpolate(messages.events[e.event.type], {
    channel: e.event.channel_type === 'C' ? `<#${channel.id}>` : `#${channel.name}`,
    cmd: config.slack.slash_command,
    color: config.slack.color,
    team: team.domain,
    ts: e.event.event_ts,
    url: `${prefix}${folder.id}`
  });

  // Member joined channel
  if (e.event.type === 'member_joined_channel') {

    // Route message
    response.channel = channel.id;
    response.user = user.id;

    // Post ephemeral message
    console.log('POSTING EPHEMERAL RESPONSE');
    return slack.chat.postEphemeral(response).then((res) => { return e; });
  }

  // Member left channel
  else if (e.event.type === 'member_left_channel') {

    // Open DM
    return slack.im.open({user: user.id})
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
  record = interpolate(messages.log.success, {
    channel: e.event.channel_type === 'C' ? `<#${channel.id}>` : `#${channel.name}`,
    cmd: config.slack.slash_command,
    event: JSON.stringify(e.event).replace(/"/g, '\\"'),
    title: titlize(e.event.type),
    ts: e.event.event_ts,
    user: e.event.user === undefined ? 'N/A' : `<@${e.event.user}>`
  });
  record.channel = config.slack.channel;

  // Post record message
  console.log(`POSTING RECORD ${JSON.stringify(record)}`);
  return slack.chat.postMessage(record)
    .then((res) => { return; })
    .catch((err) => { console.error(JSON.stringify(err)); throw err; });
}

/**
 * Post error message to Slack.
 *
 * @param {object} err Error.
 * @param {object} e Slack event object.
 */
function postError(err, e, callback) {
  // Build message
  const error = interpolate(messages.log.error, {
    error_message: err.message,
    error_name: err.name,
    event: JSON.stringify(e).replace(/"/g, '\\"'),
    stack: err.stack.replace(/\n/g, '\\n'),
    ts: new Date()/1000
  });
  error.channel = config.slack.channel;

  // Post error message back to Slack
  console.error(`POSTING ERROR ${JSON.stringify(error)}`);
  slack.chat.postMessage(error);

  callback();
}

/**
 * Determine if work is to be done.
 *
 * @param {object} e Slack event object message.
 * @param {object} e.event Slack event object.
 */
function processEvent(e) {
  // Channel renamed
  if (e.event.type === 'channel_rename') {
    return Promise.resolve(e).then(renameOrCreateFolder);
  }

  // Member joined channel
  else if (e.event.type === 'member_joined_channel' && userPermitted(e)) {
    return Promise.resolve(e)
      .then(getUser)
      .then(findOrCreateFolder)
      .then(addPermission)
      .then(recordPermission)
      .then(postResponse)
  }

  // Member left channel
  else if (e.event.type === 'member_left_channel' && userPermitted(e)) {
    return Promise.resolve(e)
      .then(getUser)
      .then(findOrCreateFolder)
      .then(findPermission)
      .then(revokePermission)
      .then(removePermission)
      .then(postResponse)
  }

  // User event, but user is not permitted to evoke event
  else if (userEvent(e)) {
    e.event.type = `${e.event.type} (Testing Only)`;
    return Promise.resolve(e).then(getUser);
  }

  // Error
  throw new Error('Unhandled Event Type');
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
    .then(callback)
    .catch((err) => postError(err, event.data, callback));
};
