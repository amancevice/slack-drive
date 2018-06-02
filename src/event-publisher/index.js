const config = require('./config.json')

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
 * Send OK HTTP response back to requester.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendResponse(req, res) {
  if (req.body.type === 'url_verification') {
    res.json({challenge: req.body.challenge});
  } else {
    res.send('OK');
  }
  return req;
}

/**
 * Send Error HTTP response back to requester.
 *
 * @param {object} err The error object.
 * @param {object} req Cloud Function request context.
 */
function sendError(err, res) {
  console.error(err);
  res.status(err.code || 500).send(err);
  return Promise.reject(err);
}

/**
 * Publish event to PubSub topic (if it's not a retry).
 *
 * @param {object} req Cloud Function request context.
 */
function publishEvent(req) {
  // Skip if this is a Slack retry event (there must be a better way to handle this...)
  if (req.headers['x-slack-retry-num'] !== undefined) return Promise.resolve(req);

  // Publish event to PubSub if it is an `event_callback`
  if (req.body.type === 'event_callback') {
    const service = require('./client_secret.json');
    const { google } = require('googleapis');
    const scopes = ['https://www.googleapis.com/auth/pubsub'];
    const topic = `projects/${config.cloud.project_id}/topics/${config.cloud.events_topic}`;
    const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
    const pubsub = google.pubsub({version: 'v1', auth: jwt});
    const data = Buffer.from(JSON.stringify(req.body)).toString('base64');

    return pubsub.projects.topics.publish({
        topic: topic,
        resource: {
          messages: [
            {
              data: data
            }
          ]
        }
      })
      .then((pub) => {
        console.log(`PUBSUB ${JSON.stringify(pub.data)}`);
        return req;
      });
  }

  // Resolve request without publishing
  return Promise.resolve(req);
}

/**
 * Responds to any HTTP request that can provide a "message" field in the body.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
exports.publishEvent = (req, res) => {
  // Respond to Slack
  Promise.resolve(req)
    .then(logEvent)
    .then(verifyToken)
    .then(publishEvent)
    .then((req) => sendResponse(req, res))
    .catch((err) => sendError(err, res));
}
