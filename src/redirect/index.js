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
let channel, user, folder, permission;

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
 * Log request info.
 *
 * @param {object} req Cloud Function request context.
 */
function logRequest(req) {
  console.log(`HEADERS ${JSON.stringify(req.headers)}`);
  console.log(`QUERY ${JSON.stringify(req.query)}`);
  return req;
}

/**
 * Get Slack channel info.
 *
 * @param {object} req Cloud Function request context.
 */
function getChannel(req) {

  // Get channel info from Slack
  if (req.query.channel[0] === 'C') {
    return slack.channels.info({channel: req.query.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.channel.name}`);
        channel = res.channel;
        return req;
      })
      .catch((err) => {
        console.error(JSON.stringify(err));
        throw err;
      });
  }

  // Get private channel info from Slack
  else if (req.query.channel[0] === 'G') {
    return slack.groups.info({channel: req.query.channel})
      .then((res) => {
        console.log(`CHANNEL #${res.group.name}`);
        channel = res.group;
        return req;
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
 * @param {object} req Cloud Function request context.
 */
function getUser(req) {

  // Get user info from Slack
  return slack.users.info({user: req.query.user})
    .then((res) => {
      console.log(`USER @${res.user.profile.name}`);
      user = res.user;
      return req;
    })
    .catch((err) => {
      console.error(JSON.stringify(err));
      throw err;
    });
}

/**
 * Verify user in channel.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyRequest(req) {
  if (channel.members.indexOf(user.id) < 0) throw new Error('User not permitted');
  return req;
}

/**
 * Create folder in Google Drive if none exists.
 *
 * @param {object} req Cloud Function request context.
 */
function findOrCreateFolder(req) {

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
            return req;
          })
          .catch((err) => {
            console.error(err);
            throw err;
          });
      }

      // Return if folder exists
      console.log(`FOUND FOLDER #${channel.name}`);
      res.data.files.map((x) => { folder = x; });
      return req;
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

/**
 * Add permission to access folder in Google Drive.
 *
 * @param {object} req Cloud Function request context.
 */
function addPermission(req) {

  if (user.profile.email === undefined) throw new Error('No email defined for Slack user');

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
      return req;
    });
}

/**
 * Record permission info in Realtime database
 *
 * @param {object} req Cloud Function request context.
 */
function recordPermission(req) {
  return firebase.database()
    .ref(`slack-drive/permissions/${channel.id}/${user.id}`)
    .set(permission)
    .then(() => {
      console.log(`RECORDED ${JSON.stringify(permission)}`);
      return req;
    });
}

/**
 * Post success message to Slack
 *
 * @param {object} req Cloud Function request context.
 */
function postRecord(req) {

  // Build message
  record = interpolate(messages.log.success, {
    channel: req.query.channel[0] === 'C' ? `<#${channel.id}>` : `#${channel.name}`,
    cmd: config.slack.slash_command,
    event: JSON.stringify(req.query).replace(/"/g, '\\"'),
    title: 'Slash Command Redirect',
    ts: new Date()/1000,
    user: `<@${req.query.user}>`
  });
  record.channel = config.slack.channel;

  // Post record message
  console.log(`POSTING RECORD ${JSON.stringify(record)}`);
  return slack.chat.postMessage(record)
    .then((res) => { return req; })
    .catch((err) => { console.error(JSON.stringify(err)); throw err; });
}

/**
 * Do Redirect.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendRedirect(req, res) {
  console.log(`REDIRECTING TO ${prefix}${folder.id}`);
  res.redirect(`${prefix}${folder.id}`);
}

/**
 * Error.
 *
 * @param {object} err Error.
 * @param {object} res Cloud Function response context.
 */
function sendError(err, res) {
  console.error(err);
  res.json({error: err.message});
  throw err;
}

/**
 * Responds to any HTTP request that can provide a "message" field in the body.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
exports.redirect = (req, res) => {
  // Send slash-command response
  Promise.resolve(req)
    .then(logRequest)
    .then(getChannel)
    .then(getUser)
    .then(verifyRequest)
    .then(findOrCreateFolder)
    .then(addPermission)
    .then(recordPermission)
    .then(postRecord)
    .then((req) => sendRedirect(req, res))
    .catch((err) => sendError(err, res));
}
