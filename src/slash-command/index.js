const config = require('./config.json');

/**
 * Log event info.
 *
 * @param {object} req Cloud Function request context.
 */
function logEvent(req) {
  return Promise.resolve(req)
    .then((req) => {
      console.log(`HEADERS ${JSON.stringify(req.headers)}`);
      return req;
    });
}

/**
 * Verify request contains proper validation token.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyToken(req) {
  return Promise.resolve(req)
    .then((req) => {
      // Verify token
      if (!req.body || req.body.token !== config.slack.verification_token) {
        const error = new Error('Invalid Credentials');
        error.code = 401;
        throw error;
      }

      return req;
    });
}

/**
 * Verify request contains proper subcommand.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyText(req) {
  return Promise.resolve(req)
    .then((req) => {
      if (req.body.text === 'drive') return req;
      throw new Error(`Unknown text: ${req.body.text}`);
    });
}

/**
 * Publish event to PubSub topic (if it's not a retry).
 *
 * @param {object} req Cloud Function request context.
 */
function getFolder(req) {
  const service = require('./client_secret.json');
  const { google } = require('googleapis');
  const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
  const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
  const drive = google.drive({version: 'v3', auth: jwt});

  return drive.files.list({
      q: `appProperties has { key='channel' and value='${req.body.channel_id}' }`
    })
    .then((res) => {
      res.data.files.map((x) => { req.folder = x; });
      return req;
    });
}

/**
 * Send OK HTTP response back to requester.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendResponse(req, res) {
  config.slack.subcommands[req.body.text].message.attachments.slice(0, 1).map((a) => {
    a.actions.map((b) => {
      if (req.folder !== undefined) {
        b.url = `https://drive.google.com/drive/u/0/folders/${req.folder.id}`;
      } else {
        b.url = 'https://drive.google.com/';
      }
    });
  });
  res.json(config.slack.subcommands[req.body.text].message);
}

/**
 * Send Error HTTP response back to requester.
 *
 * @param {object} err The error object.
 * @param {object} req Cloud Function request context.
 */
function sendError(err, res) {
  console.error(err);
  res.json({text: ':thinking_face: Hmm, I don\'t know that command...'});
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
    .then(getFolder)
    .then((req) => sendResponse(req, res))
    .catch((err) => sendError(err, res));
}
