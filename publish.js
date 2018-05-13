const { WebClient } = require('@slack/client');
const config = require('./config.json');
const slack = new WebClient(config.slack.api_token);

/**
 * Bad HTTP Request.
 */
class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequest';
    this.code = 405;
  }
}

/**
 * Unhandled request or event type.
 */
class UnhandledRequest extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnhandledRequest';
    this.code = 501;
  }
}

/**
 * Invalid token.
 */
class InvalidCredentials extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidCredentials';
    this.code = 401;
  }
}

/**
 * Publish error.
 */
class PubSubError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PubsubError';
    this.code = 500;
  }
}

/**
 * Verify that request is a POST.
 *
 * @param {string} method The request HTTP method.
 */
function verifyMethod(method) {
  if (method !== 'POST') {
    throw new BadRequest('Only POST requests are accepted');
  }
}

/**
 * Verify that the webhook request came from Slack.
 *
 * @param {object} body       The body of the request.
 * @param {string} body.token The Slack token to be verified.
 */
function verifyToken(body) {
  if (!body || body.token !== config.slack.verification_token) {
    throw new InvalidCredentials('Invalid Credentials');
  }
}

/**
 * Handle Slack event types.
 *
 * @param {object} slackEvent The Slack event object.
 */
function publishEvent(slackEvent) {
  let dataBuffer = Buffer.from(JSON.stringify(slackEvent));
  pubsub.topic(config.cloud.pubsub_topic)
    .publisher()
    .publish(dataBuffer)
    .then((mid) => { return {messageId: mid}; })
    .catch((err) => { throw new PubSubError(err); });
  return slackEvent;
}

/**
 * Compose Slack message from error.
 *
 * @param {object} error Error object.
 */
function slackErrorMessage(error) {
  let msg = JSON.parse(JSON.stringify(config.slack.message_template));
  try {
    msg.attachments[0].fields[0].value = error.name;
    msg.attachments[0].fields[1].value = error.message;
    msg.attachments[0].fields[2].value = `\`\`\`\n${error.stack}\n\`\`\``;
    msg.attachments[0].ts = new Date()/1000;
  }
  catch(err) {
    msg.attachments = [
      {
        color: 'danger',
        text: `\`\`\`\n${error}\n\`\`\``,
        footer: 'Slack | Google Drive Sync',
        ts: new Date()/1000
      }
    ];
  }
  return msg;
}

/**
 * Compose Slack message from error.
 *
 * @param {object} error Error object.
 */
function postErrorMessage(error) {
  slack.chat.postMessage(slackErrorMessage(error))
    .then((res) => {
      // Return rejection of original error
      return Promise.reject(error);
    })
    .catch((err) => {
      // Return rejection of the error to post to Slack
      return Promise.reject(err);
    });
}

/**
 * Receive an Event from Slack.
 *
 * Trigger this function by making a POST request with a payload to:
 * https://[YOUR_REGION].[YOUR_PROJECT_ID].cloudfunctions.net/slackEvent
 *
 * @example
 * curl -X POST 'https://us-central1.project-id.cloudfunctions.net/slack-event' --data @json_filepath
 *
 * @param {object} req            Cloud Function request object.
 * @param {object} req.body       The request payload.
 * @param {string} req.body.token Slack's verification token.
 * @param {string} req.body.type  Slack event type.
 * @param {string} req.body.event Slack event object.
 * @param {object} res            Cloud Function response object.
 */
exports.publishEvent = (req, res) => {
  return Promise.resolve()
    .then(() => {
      // Verify request
      verifyMethod(req.method);
      verifyToken(req.body);

      // Return challenge
      if (req.body.type === 'url_verification') {
        return {challenge: req.body.challenge};
      }

      // Handle event
      else if (req.body.type === 'event_callback') {
        // Log request
        console.log(`Received ${JSON.stringify(req.body.event)}`);
        return publishEvent(req.body.event);
      }

      // Unknown
      else {
        throw new UnhandledRequest(`Unknown event type: ${req.body.type}`);
      }
    })
    .then((msg) => {
      // Log response
      console.log(`Publishing ${JSON.stringify(msg)}`);

      // Return JSON
      res.json(msg);
    })
    .catch((err) => {
      // Log error
      console.error(err);

      // Post error to Slack
      res.status(err.code || 500).send(err);
      return postErrorMessage(err);
    });
};
