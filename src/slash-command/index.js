const config = require('./config.json');
const messages = require('./messages.json');
const redirect = `https://${config.cloud.region}-${config.cloud.project_id}.cloudfunctions.net/${config.cloud.redirect}`;

/**
 * Log event info.
 *
 * @param {object} req Cloud Function request context.
 */
function logEvent(req) {
  console.log(`HEADERS ${JSON.stringify(req.headers)}`);
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
 * Verify request contains proper subcommand.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyText(req) {
  if (req.body.text === 'drive') return req;
  throw new Error(`Unknown text: ${req.body.text}`);
}

/**
 * Send OK HTTP response back to requester.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendResponse(req, res) {
  messages.attachments.drive_link.actions[0].url = `${redirect}?channel=${req.body.channel_id}`;
  messages.attachments.drive_warning.ts = new Date()/1000;
  res.json({
    attachments: [
      messages.attachments.drive_link,
      messages.attachments.drive_warning,
    ]
  });
}

/**
 * Send Error HTTP response back to requester.
 *
 * @param {object} err The error object.
 * @param {object} req Cloud Function request context.
 */
function sendError(err, res) {
  console.error(err);
  res.json({text: messages.texts.slash_error});
}

/**
 * Responds to any HTTP request that can provide a "message" field in the body.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
exports.slashCommand = (req, res) => {
  Promise.resolve(req)
    .then(logEvent)
    .then(verifyToken)
    .then(verifyText)
    .then((req) => sendResponse(req, res))
    .catch((err) => sendError(err, res));
}
