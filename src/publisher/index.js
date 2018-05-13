const { google } = require('googleapis');
const config = require('./config.json')
const service = require('./client_secret.json')
const scopes = ['https://www.googleapis.com/auth/pubsub'];
const jwt = new google.auth.JWT(service.client_email, './client_secret.json', null, scopes);
const pubsub = google.pubsub({version: 'v1', auth: jwt});
const topic = `projects/${config.cloud.project_id}/topics/${config.cloud.pubsub_topic}`;

exports.publishEvent = (req, res) => {
  return Promise.resolve()
    .then(() => {
      console.log(req.headers);
      if (!req.body || req.body.token !== config.slack.verification_token) {
        const error = new Error('Invalid Credentials');
        error.code = 401;
        throw error;
      }
      else if (req.body.type === 'url_verification') {
        return {challenge: req.body.challenge};
      }
      else if (req.body.type === 'event_callback') {
        console.log(req.body.event);
        return pubsub.projects.topics.publish({
          topic: topic,
          resource: {
            messages: [
              {
                data: Buffer.from(JSON.stringify(req.body.event)).toString('base64')
              }
            ]
          }
        })
        .then((res) => {
          return res.data;
        })
        .catch((err) => {
          const error = new Error('Publish Error');
          error.code = 500;
          throw error;
        });
      }
    })
    .then((msg) => {
      console.log(msg);
      res.json(msg);
    })
    .catch((err) => {
      console.error(err);
      res.status(err.code || 500).send(err);
      return Promise.reject(err);
    });
};
