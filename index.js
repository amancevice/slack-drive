const { WebClient } = require('@slack/client');
const config = require('./config.json');
const slack = new WebClient(config.slack_api_token);

/**
 * Bad HTTP Request
 */
class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequest';
    this.code = 405;
  }
}

/**
 * Unhandled request or event type
 */
class UnhandledRequest extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnhandledRequest';
    this.code = 501;
  }
}

/**
 * Invalid token
 */
class InvalidCredentials extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidCredentials';
    this.code = 401;
  }
}

/**
 * Handle channel_created
 *
 * @param {object}  slackEvent                         The Slack event object
 * @param {string}  slackEvent.type                    Event type
 * @param {object}  slackEvent.channel                 Channel object
 * @param {string}  slackEvent.channel.id              Channel ID
 * @param {boolean} slackEvent.channel.is_channel      Is channel
 * @param {string}  slackEvent.channel.name            Channel name
 * @param {string}  slackEvent.channel.name_normalized Normalized channel name
 * @param {number}  slackEvent.channel.created         Created timestamp
 * @param {string}  slackEvent.event_ts                Event timestamp
 */
function handleChannelCreated(slackEvent) {
  return slackEvent;
}

/**
 * Handle channel_rename
 *
 * @param {object}  slackEvent                         The Slack event object
 * @param {string}  slackEvent.type                    Event type
 * @param {object}  slackEvent.channel                 Channel object
 * @param {string}  slackEvent.channel.id              Channel ID
 * @param {boolean} slackEvent.channel.is_channel      Is channel
 * @param {string}  slackEvent.channel.name            Channel name
 * @param {string}  slackEvent.channel.name_normalized Normalized channel name
 * @param {number}  slackEvent.channel.created         Created timestamp
 * @param {string}  slackEvent.event_ts                Event timestamp
 */
function handleChannelRename(slackEvent) {
  return slackEvent;
}

/**
 * Handle group_rename
 *
 * @param {object}  slackEvent                         The Slack event object
 * @param {string}  slackEvent.type                    Event type
 * @param {object}  slackEvent.channel                 Channel object
 * @param {string}  slackEvent.channel.id              Channel ID
 * @param {boolean} slackEvent.channel.is_channel      Is channel
 * @param {string}  slackEvent.channel.name            Channel name
 * @param {string}  slackEvent.channel.name_normalized Normalized channel name
 * @param {number}  slackEvent.channel.created         Created timestamp
 * @param {string}  slackEvent.event_ts                Event timestamp
 */
function handleGroupRename(slackEvent) {
  return slackEvent;
}

/**
 * Handle member_left_channel
 *
 * @param {object} slackEvent              The Slack event object
 * @param {string} slackEvent.type         Event type
 * @param {string} slackEvent.user
 * @param {string} slackEvent.channel
 * @param {string} slackEvent.channel_type Channel type
 * @param {string} slackEvent.team
 * @param {string} slackEvent.event_ts
 */
function handleMemberLeftChannel(slackEvent) {
  return slackEvent;
}

/**
 * Handle member_joined_channel
 *
 * @param {object} slackEvent              The Slack event object
 * @param {string} slackEvent.type         Event type
 * @param {string} slackEvent.user
 * @param {string} slackEvent.channel
 * @param {string} slackEvent.channel_type Channel type
 * @param {string} slackEvent.team
 * @param {string} slackEvent.inviter
 * @param {string} slackEvent.event_ts
 */
function handleMemberJoinedChannel(slackEvent) {
  return slackEvent;
}

/**
 * Handle team_join
 *
 * @param {object} slackEvent      The Slack event object
 * @param {string} slackEvent.type Event type
 * @param {object} slackEvent.user User object
 */
function handleTeamJoin(slackEvent) {
  return slackEvent;
}

/**
 * Handle Slack event types
 *
 * @param {object} slackEvent The Slack event object
 */
function handleEvent(slackEvent) {
  return new Promise((resolve, reject) => {
    if (slackEvent.type === 'channel_created') {
      resolve(handleChannelCreated(slackEvent));
    }
    else if (slackEvent.type === 'channel_rename') {
      resolve(handleChannelRename(slackEvent));
    }
    else if (slackEvent.type === 'group_rename') {
      resolve(handleGroupRename(slackEvent));
    }
    else if (slackEvent.type === 'member_left_channel') {
      resolve(handleMemberLeftChannel(slackEvent));
    }
    else if (slackEvent.type === 'member_joined_channel') {
      resolve(handleMemberJoinedChannel(slackEvent));
    }
    else if (slackEvent.type === 'team_join') {
      resolve(handleTeamJoin(slackEvent));
    }
    else {
      reject(new UnhandledRequest('Unhandled event type: ' + slackEvent.type));
    }
  })
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
  if (!body || body.token !== config.slack_verification_token) {
    throw new InvalidCredentials('Invalid Credentials');
  }
}

/**
 * Compose Slack Message from error
 *
 * @param {object} error Error object
 */
function slackErrorMessage(error) {
  let msg = JSON.parse(JSON.stringify(config.slack_message_template));
  try {
    msg.attachments.map(function(x) {
      x.fields[0].value = error.name;
      x.fields[1].value = error.message;
      x.ts = new Date()/1000;
    });
  }
  catch(e) {
    msg.attachments = [{
      color: "danger",
      text: "```\n" + error + "\n```",
      footer: "Slack | Google Drive Sync",
      ts: new Date()/1000
    }];
  }
  return msg;
}

/**
 * Receive an Event from Slack.
 *
 * Trigger this function by making a POST request with a payload to:
 * https://[YOUR_REGION].[YOUR_PROJECT_ID].cloudfunctions.net/slackEvent
 *
 * @example
 * curl -X POST "https://us-central1.project-id.cloudfunctions.net/slackEvent" --data @json_filepath
 *
 * @param {object} request            Cloud Function request object.
 * @param {object} request.body       The request payload.
 * @param {string} request.body.token Slack's verification token.
 * @param {string} request.body.text  The user's search query.
 * @param {object} respose            Cloud Function response object.
 */
exports.slackEvent = (req, res) => {
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
        return handleEvent(req.body.event);
      }

      // Unknown
      else {
        throw new UnhandledRequest('Unknown request type: ' + req.body.type);
      }
    })
    .then((response) => {
      res.json(response);
    })
    .catch((error) => {
      slack.chat.postMessage(slackErrorMessage(error))
      .then((res) => {
        res.status(error.code || 500).send(error);
        return Promise.reject(error);
      }).catch((error) => {
        res.status(error.code || 500).send(error);
        return Promise.reject(error);
      });
    });
};
