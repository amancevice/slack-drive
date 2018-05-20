const service = require('./client_secret.json');
const { google } = require('googleapis');
const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
const drive = google.drive({version: 'v3', auth: jwt});

/**
 * Publish event to PubSub topic (if it's not a retry).
 *
 * @param {object} req Cloud Function request context.
 */
function getFolder(req) {
  return drive.files.list({
      q: `appProperties has { key='channel' and value='${req.query.channel}' }`
    })
    .then((res) => {
      res.data.files.map((x) => { req.folder = x; });
      return req;
    });
}

/**
 * Redirects to Google Drive
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
function redirect(req, res) {
  if (req.folder) {
    res.redirect(`https://drive.google.com/drive/u/0/folders/${req.folder.id}`);
  } else {
    res.redirect('https://drive.google.com/')
  }
}

/**
 * Responds to any HTTP request that can provide a "message" field in the body.
 *
 * @param {object} req Cloud Function request context.
 * @param {object} res Cloud Function response context.
 */
exports.redirect = (req, res) => {
  Promise.resolve(req)
    .then(getFolder)
    .then((req) => redirect(req, res));
};
