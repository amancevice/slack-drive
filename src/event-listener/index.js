const { google } = require('googleapis');
const config = require('./config.json')
const service = require('./client_secret.json');
const scopes = ['https://www.googleapis.com/auth/pubsub'];
const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
const pubsub = google.pubsub({version: 'v1', auth: jwt});
const topic = `projects/${config.cloud.project_id}/topics/${config.cloud.pubsub_topic}`;

function logEvent(req) {
  return Promise.resolve(req)
    .then((req) => {
      console.log(`HEADERS ${JSON.stringify(req.headers)}`);
      console.log(`EVENT ${JSON.stringify(req.body.event)}`);
      return req;
    });
}

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

function publishEvent(req) {
  // Publish event to PubSub if it is an `event_callback`
  if (req.body.type === 'event_callback') {
    return pubsub.projects.topics.publish({
        topic: topic,
        resource: {
          messages: [
            {
              data: Buffer.from(JSON.stringify(req.body)).toString('base64')
            }
          ]
        }
      }, (error, response) => {
        if (error) throw error;
        console.log(`PUBSUB ${JSON.stringify(response.data)}`);
      });
  }

  // Otherwise, just resolve the event
  return Promise.resolve(req);
}

exports.publishEvent = (req, res) => {
  Promise.resolve(req)
    .then(logEvent)
    .then(verifyToken)
    .then(publishEvent)
    .then((pub) => {
      if (req.body.type === 'url_verification') {
        res.json({challenge: req.body.challenge});
      } else {
        res.send('OK');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(err.code || 500).send(err);
      return Promise.reject(err);
    });
}
