const config = require('./config.json');
const messages = require('./messages.json');

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
  console.log(`REQUEST ${JSON.stringify({
    channel_id: req.body.channel_id,
    user_id: req.body.user_id,
    text: req.body.text
  })}`);
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
 * Verify request contains permitted user.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyUser(req) {
  console.log(req.body.user_id);
  if (config.slack.users.excluded.indexOf(req.body.user_id) >= 0 ||  // *not* excluded
      (config.slack.users.included.length > 0 &&                     // non-empty included
       config.slack.users.included.indexOf(req.body.user_id) < 0)) { // not included
    return Promise.reject(messages.slash_commands.bad_user);
  }
  return Promise.resolve(req);
}

/**
 * Verify request contains valid channel.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyChannel(req) {
  if (req.body.channel_id[0] !== 'C' && req.body.channel_id[0] !== 'G') {
    return Promise.reject(messages.slash_commands.bad_channel);
  }
  return Promise.resolve(req);
}

/**
 * Verify request contains valid text.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyText(req) {
  if (messages.slash_commands[req.body.text || 'help'] === undefined) {
    return Promise.reject(interpolate(messages.slash_commands.bad_text, {
      cmd: config.slack.slash_command,
    }));
  }
  return Promise.resolve(req);
}

/**
 * Get response message.
 *
 * @param {object} req Cloud Function request context.
 */
function getMessage(req) {
  return Promise.resolve(interpolate(messages.slash_commands[req.body.text || 'help'], {
    channel: req.body.channel_id[0] === 'C' ? `<#${req.body.channel_id}>` : 'this channel',
    cmd: config.slack.slash_command,
    color: config.slack.color,
    ts: new Date()/1000,
    team: req.body.team_domain,
    url: `https://${config.cloud.region}-${config.cloud.project_id}.cloudfunctions.net/${config.cloud.redirect_function}?channel=${req.body.channel_id}&user=${req.body.user_id}`,
  }));
}

/**
 * Get error message.
 *
 * @param {object} msg Error message.
 */
function getError(msg) {
  return Promise.resolve(msg);
}

/**
 * Get Slack message to send to user
 *
 * @param {object} req Cloud Function request context.
 */
function getResponse(req) {
  return Promise.resolve(req)
    .then(verifyUser)
    .then(verifyChannel)
    .then(verifyText)
    .then(getMessage)
    .catch(getError);
}

/**
 * Send message back to issuer.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendResponse(msg, res) {
  console.log(JSON.stringify(msg))
  res.json(msg);
}

/**
 * Send Error message back to issuer.
 *
 * @param {object} err The error object.
 * @param {object} res Cloud Function response context.
 */
function sendError(err, res) {
  console.error(err);
  res.status(err.code || 500).send(err);
  return Promise.reject(err);
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
    .then(getResponse)
    .then((msg) => sendResponse(msg, res))
    .catch((err) => sendError(err, res));
}
