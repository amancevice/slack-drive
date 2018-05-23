const config = require('./config.json');
const messages = require('./messages.json');
const subcommands = ['', 'help', 'link'];

Object.prototype.interpolate = function(mapping) {
  let that = JSON.parse(JSON.stringify(this));
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
  return Promise.resolve(req);
}

/**
 * Verify request contains proper validation token.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyToken(req) {
  // Verify token

  if (!req.body || req.body.token !== config.slack.verification_token) {
    return Promise.reject(messages.bad_token);
  }
  return Promise.resolve(req);
}

/**
 * Verify request contains valid text.
 *
 * @param {object} req Cloud Function request context.
 */
function verifyText(req) {
  if (subcommands.indexOf(req.body.text) < 0) {
    return Promise.reject(messages.bad_text.interpolate({
      cmd: config.slack.slash_command
    }));
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
    return Promise.reject(messages.not_permitted);
  }
  return Promise.resolve(req);
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
    return Promise.reject(messages.bad_channel);
  }
  return Promise.resolve(req);
}

function getResponse(req) {
  // drive (help)
  if (req.body.text === '' || req.body.text === 'help') {
    return Promise.resolve(messages.help.interpolate({
      channel: req.body.channel_id[0] === 'C' ? `<#${req.body.channel_id}>` : 'this channel',
      cmd: config.slack.slash_command,
      color: config.app.color,
      team: req.body.team_domain,
      ts: new Date()/1000,
    }));
  }

  // drive link
  else if (req.body.text === 'link') {
    return Promise.resolve(messages.link.interpolate({
      channel: req.body.channel_id[0] === 'C' ? `<#${req.body.channel_id}>` : 'this channel',
      cmd: config.slack.slash_command,
      color: config.app.color,
      ts: new Date()/1000,
      team: req.body.team_domain,
      url: `${config.slack.redirect_url}?channel=${req.body.channel_id}&user=${req.body.user_id}`,
    }));
  }
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
  console.error(JSON.stringify(err));
  res.json(err);
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
    .then(getResponse)
    .then((msg) => sendResponse(msg, res))
    .catch((err) => sendError(err, res));
}
