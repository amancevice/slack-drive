const config = require('./config.json');
const messages = require('./messages.json');
const responses = {};

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
  // drive (help)
  if (req.body.text === '' || req.body.text === 'help') {
    responses.message = JSON.parse(
      JSON.stringify(messages.help)
        .replace(/\$\{cmd\}/g, config.slack.slash_command)
        .replace(/\$\{ts\}/g, new Date()/1000)
    );
  }

  // drive link
  else if (req.body.text === 'link') {
    responses.message = JSON.parse(
      JSON.stringify(messages.link)
        .replace(/\$\{cmd\}/g, config.slack.slash_command)
        .replace(/\$\{ts\}/g, new Date()/1000)
        .replace(/\$\{url\}/g, `${config.slack.redirect_url}?channel=${req.body.channel_id}&user=${req.body.user_id}`)
    );
  }

  // drive ?
  else {
    throw new Error(`Unknown text: ${req.body.text}`);
  }

  console.log(`VERIFIED /${config.slack.slash_command} ${req.body.text}`);
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
    console.log('USER NOT PERMITTED');
    responses.message = messages.not_permitted;
    return req;
  }
  else {
    console.log('USER PERMITTED');
    return req;
  }
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
    console.log('BAD CHANNEL');
    responses.message = messages.bad_channel;
    return req;
  }
  else {
    console.log('VALID CHANNEL');
    return req;
  }
}

/**
 * Send message back to issuer.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function sendResponse(req, res) {
  console.log(`RESPONSE ${JSON.stringify(responses.message)}`);
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
  console.error(`ERROR RESPONSE ${JSON.stringify(messages.error)}`);
  responses.error = JSON.parse(
    JSON.stringify(messages.error)
      .replace(/\$\{cmd\}/g, config.slack.slash_command)
  );
  res.json(responses.error);
  throw err;
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
    .then(verifyChannel)
    .then((req) => sendResponse(req, res))
    .catch((err) => sendError(err, res));
}
