const { google } = require('googleapis');
const config = require('./config.json')
const service = require('./client_secret.json');
const scopes = ['https://www.googleapis.com/auth/pubsub'];
const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
const pubsub = google.pubsub({version: 'v1', auth: jwt});
const topic = `projects/${config.cloud.project_id}/topics/${config.cloud.pubsub_topic}`;

exports.publishEvent = (req, res) => {
  return Promise.resolve()
    .then(() => {
      // Log headers to show Slack retries
      console.log(req.headers);

      // Verify token
      if (!req.body || req.body.token !== config.slack.verification_token) {
        const error = new Error('Invalid Credentials');
        error.code = 401;
        throw error;
      }

      // Return challenge
      else if (req.body.type === 'url_verification') {
        return {challenge: req.body.challenge};
      }

      // Send event to PubSub
      else if (req.body.type === 'event_callback') {
        console.log(req.body.event);
        return new Promise((resolve, reject) => {
          pubsub.projects.topics.publish({
              topic: topic,
              resource: {
                messages: [
                  {
                    data: Buffer.from(JSON.stringify(req.body)).toString('base64')
                  }
                ]
              }
            }, (err, response) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(response.data);
            });
          });
      }
    })
    .then((msg) => {
      console.log(msg);
      res.send('OK');
    })
    .catch((err) => {
      console.error(err);
      res.status(err.code || 500).send(err);
      return Promise.reject(err);
    });
};
