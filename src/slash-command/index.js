const config = require('./config.json');
const messages = require('./messages.json');
const subcommands = ['', 'help', 'link'];
const responses = {error: ":boom: Uh oh, something went wrong..."};

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
    responses.error = messages.bad_token;
    throw new Error('Invalid Credentials');
  }
  return req;
}

/**
 * Verify request contains valid text.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyText(req) {
  if (subcommands.indexOf(req.body.text) < 0) {
    responses.error = JSON.parse(
      JSON.stringify(messages.bad_text)
        .replace(/\$\{cmd\}/g, config.slack.slash_command)
    );
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
  return config.slack.users.excluded.indexOf(req.body.user_id) < 0 && // *not* excluded
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
    responses.error = messages.not_permitted;
    throw new Error(`User not permitted: ${req.body.user_id}`);
  }
  return req;
}

/**
 * Verify channel is public or private.
 *
 * @param {object} req Cloud Function request context.
 */
function validChannel(req) {
  return req.body.channel_id[0] === 'C' ||
         req.body.channel_id[0] === 'G'
}

/**
 * Verify request contains valid channel.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyChannel(req) {
  if (!validChannel(req)) {
    responses.error = messages.bad_channel;
    throw new Error(`Bad channel: ${req.body.channel_id}`);
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

  // drive (help)
  if (req.body.text === '' || req.body.text === 'help') {
    responses.message = JSON.parse(
      JSON.stringify(messages.help)
        .replace(/\$\{channel\}/g, req.body.channel_id[0] === 'C' ? `<#${req.body.channel_id}>` : 'this channel')
        .replace(/\$\{cmd\}/g, config.slack.slash_command)
        .replace(/\$\{ts\}/g, new Date()/1000)
    );
  }

  // drive link
  else if (req.body.text === 'link') {
    responses.message = JSON.parse(
      JSON.stringify(messages.link)
        .replace(/\$\{channel\}/g, req.body.channel_id)
        .replace(/\$\{cmd\}/g, config.slack.slash_command)
        .replace(/\$\{ts\}/g, new Date()/1000)
        .replace(/\$\{url\}/g, `${config.slack.redirect_url}?channel=${req.body.channel_id}&user=${req.body.user_id}`)
    );
  }
  res.json(responses.message);
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
  res.json(responses.error);
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
    .then(verifyChannel)
    .then(verifyUser)
    .then(verifyText)
    .then((req) => sendResponse(req, res))
    .catch((err) => sendError(err, res));
}
