const config = require('./config.json');
const messages = require('./messages.json');
const msg = {};

/**
 * Log request info.
 *
 * @param {object} req Cloud Function request context.
 */
function logRequest(req) {
  console.log(`HEADERS ${JSON.stringify(req.headers)}`);
  console.log(`REQUEST ${JSON.stringify({
    channel_id: req.body.channel_id,
    user_id: req.body.user_id,
    text: req.body.text,
    response_url: req.body.response_url})}`);
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
 * Verify request contains valid text.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyText(req) {
  // base subcommand
  if (req.body.text === '') {
    msg.message = messages.null;
  } else if (req.body.text === 'help') {
    msg.message = JSON.parse(
      JSON.stringify(messages.help)
        .replace(/\$\{cmd\}/g, config.slack.slash_command)
        .replace(/\$\{ts\}/g, new Date()/1000)
    );
  } else {
    throw new Error(`Unknown text: ${req.body.text}`);
  }
  return req;
}

/**
 * Determine if user is permitted to use this service.
 *
 * @param {object} req Cloud Function request context.
 */
function userPermitted(req) {
  return config.slack.users.excluded.indexOf(req.body.user_id) < 0 &&  // *not* excluded
         (config.slack.users.included.length === 0 ||                  // no includes
          config.slack.users.included.indexOf(req.body.user_id) >= 0); // explicit include
}

/**
 * Verify request contains permitted user.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyUser(req) {
  if (req.body.text !== 'help' && !userPermitted(req)) {
    console.log('USER NOT PERMITTED');
    msg.message = messages.not_permitted;
  }
  return req;
}

/**
 * Send message back to issuer.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendResponse(req, res) {
  res.json(msg.message);
  return req;
}

/**
 * Send Error message back to issuer.
 *
 * @param {object} err The error object.
 * @param {object} res Cloud Function response context.
 */
function sendError(err, res) {
  console.error(err);
  msg.message = JSON.parse(
    JSON.stringify(messages.error)
      .replace(/\$\{cmd\}/g, config.slack.slash_command)
  );
  res.json(msg.message);
  throw err;
}

/**
 * Publish event to PubSub topic (if it's not a retry).
 *
 * @param {object} req Cloud Function request context.
 */
function publishRequest(req) {
  if (userPermitted(req) && req.body.text === '') {
    const service = require('./client_secret.json');
    const { google } = require('googleapis');
    const scopes = ['https://www.googleapis.com/auth/pubsub'];
    const topic = `projects/${config.cloud.project_id}/topics/${config.cloud.pubsub_topic}`;
    const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
    const pubsub = google.pubsub({version: 'v1', auth: jwt});

    // Create "event" to publish
    req.body.event = {
      type: 'slash_command',
      user: req.body.user_id,
      channel: req.body.channel_id,
      channel_type: req.body.channel_id[0],
      team: req.body.team_id,
      event_ts: new Date()/1000
    };

    // Publish event
    console.log(`PUBLISHING ${topic}`);
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
    .then(verifyUser)
    .then((req) => sendResponse(req, res))
    .catch((err) => sendError(err, res));

  // Publish event to PubSub for processing
  publishRequest(req);
}
