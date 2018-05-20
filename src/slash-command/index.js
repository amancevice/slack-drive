const config = require('./config.json');
const messages = require('./messages.json');
const service = require('./client_secret.json');
const util = require('util');
const cmd = config.slack.slash_command;
const redirect = `https://${config.cloud.region}-${config.cloud.project_id}.cloudfunctions.net/${config.cloud.redirect}`;
const scopes = ['https://www.googleapis.com/auth/pubsub'];
const topic = `projects/${config.cloud.project_id}/topics/${config.cloud.pubsub.grants}`;

/**
 * Log request info.
 *
 * @param {object} req Cloud Function request context.
 */
function logRequest(req) {
  console.log(`HEADERS ${JSON.stringify(req.headers)}`);
  console.log(`RESPONSE URL ${req.body.response_url}`);
  return req;
}

/**
 * Verify request contains proper validation token.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyToken(req) {
  // Verify token
  if (!req.body || req.body.token !== config.slack.verification_token) {
    const error = new Error('Invalid Credentials');
    error.code = 401;
    throw error;
  }

  return req;
}

/**
 * Verify request contains proper text.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyText(req) {
  if (req.body.text === 'drive' ||
      req.body.text === 'help' ||
      req.body.text === 'login') return req;
  throw new Error(`Unknown text: ${req.body.text}`);
}

/**
 * Send message back to issuer.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendResponse(req, res) {
  const ts = new Date()/1000;
  if (req.body.text === 'drive') {
    res.json(JSON.parse(util.format(
      JSON.stringify(messages.drive),
      `${redirect}?channel=${req.body.channel_id}`,
      cmd,
      ts
    )));
  } else if (req.body.text === 'help') {
    res.json(JSON.parse(util.format(
      JSON.stringify(messages.help),
      cmd,
      cmd,
      cmd,
      cmd,
      ts
    )));
  } else if (req.body.text === 'login') {
    res.json(messages.login);
  }
}

/**
 * Send Error message back to issuer.
 *
 * @param {object} err The error object.
 * @param {object} req Cloud Function request context.
 */
function sendError(err, res) {
  console.error(err);
  res.json(messages.error);
}

/**
 * Publish event to PubSub topic (if it's not a retry).
 *
 * @param {object} req Cloud Function request context.
 */
function publishRequest(req) {
  const { google } = require('googleapis');
  const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
  const pubsub = google.pubsub({version: 'v1', auth: jwt});

  return pubsub.projects.topics.publish({
      topic: topic,
      resource: {
        messages: [
          {
            data: Buffer.from(JSON.stringify(req.body)).toString('base64')
          }
        ]
      }
    })
    .then((pub) => {
      console.log(`PUBLISHED ${JSON.stringify(pub.data)}`);
    });
}

/**
 * Responds to any HTTP request that can provide a "message" field in the body.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
exports.slashCommand = (req, res) => {

  // Send slash-command response
  Promise.resolve(req)
    .then(logRequest)
    .then(verifyToken)
    .then(verifyText)
    .then((req) => sendResponse(req, res))
    .catch((err) => sendError(err, res));

  // Publish request to PubSub for processing
  publishRequest(req);
}
