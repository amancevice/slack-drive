FROM node:6

# Install emulator
RUN npm install -g @google-cloud/functions-emulator

# Install app
ARG PROJECT_ID=slack-drive
ARG SLACK_EVENTS_TOPIC=slack-events
ARG SLACK_MESSAGES_TOPIC=slack-messages
ENV PROJECT_ID=${PROJECT_ID} \
    SLACK_EVENTS_TOPIC=${SLACK_EVENTS_TOPIC} \
    SLACK_MESSAGES_TOPIC=${SLACK_MESSAGES_TOPIC}
VOLUME /src
WORKDIR /src
COPY src /src
COPY docker-entrypoint /usr/local/bin/entrypoint
COPY docker-deploy /usr/local/bin/deploy
RUN entrypoint
ENTRYPOINT ["entrypoint"]
