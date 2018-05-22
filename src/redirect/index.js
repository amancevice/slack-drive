// App
const config = require('./config.json');
const messages = require('./messages.json');
const redirect = {};

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

String.prototype.titlize = function() {
  return this.replace(/_/g, ' ').split(/ /).map((x) => {
    return `${x.slice(0, 1).toUpperCase()}${x.slice(1)}`;
  }).join(' ');
}

String.prototype.tickwrap = function() {
  return `\`\`\`${this}\`\`\``;
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
        redirect.channel = res.channel;
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
        redirect.channel = res.group;
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
      console.log(`USER @${res.user.profile.display_name}`);
      redirect.user = res.user;
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
  // TODO
  if (redirect.channel.members.indexOf(redirect.user.id) < 0) throw new Error('USER NOT PERMITTED');
  return req;
}

/**
 * Create folder in Drive if none exists.
 *
 * @param {object} req Cloud Function request context.
 */
function findOrCreateFolder(req) {

  // Search for folder by channel ID in `appProperties`
  return drive.files.list({
      q: `appProperties has { key='channel' and value='${redirect.channel.id}' }`
    })
    .then((res) => {

      // Create folder and return
      if (res.data.files.length === 0) {
        console.log(`CREATING FOLDER #${redirect.channel.name}`);
        return drive.files.create({
            resource: {
              name: `#${redirect.channel.name}`,
              mimeType: mimeTypeFolder,
              folderColorRgb: red,
              appProperties: {
                channel: redirect.channel.id
              }
            }
          })
          .then((res) => {
            redirect.folder = res.data;
            return req;
          })
          .catch((err) => {
            console.error(err);
            throw err;
          });
      }

      // Return if folder exists
      console.log(`FOUND FOLDER #${redirect.channel.name}`);
      res.data.files.map((x) => { redirect.folder = x; });
      return req;
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

/**
 * Create folder in Drive if none exists.
 *
 * @param {object} req Cloud Function request context.
 */
function addPermission(req) {

  return drive.permissions.create({
      fileId: redirect.folder.id,
      sendNotificationEmail: false,
      resource: {
        role: 'writer',
        type: 'user',
        emailAddress: redirect.user.profile.email
      }
    })
    .then((res) => {
      console.log(`GRANTED ${JSON.stringify(res.data)}`);
      redirect.permission = res.data;
      return req;
    });
}

/**
 * Do Redirect.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendRedirect(req, res) {
  console.log(`REDIRECTING TO ${prefix}${redirect.folder.id}`);
  res.redirect(`${prefix}${redirect.folder.id}`);
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
    .then((req) => sendRedirect(req, res))
    .catch((err) => sendError(err, res));
}
