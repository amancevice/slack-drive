FROM node:6
RUN apt-get update && apt-get install -y zip && \
    npm install -g @google-cloud/functions-emulator
ARG PROJECT_ID=slack-drive
ARG SLACK_EVENTS_TOPIC=slack-events
ARG SLACK_MESSAGES_TOPIC=slack-messages
ENV PROJECT_ID=${PROJECT_ID} \
    SLACK_EVENTS_TOPIC=${SLACK_EVENTS_TOPIC} \
    SLACK_MESSAGES_TOPIC=${SLACK_MESSAGES_TOPIC}
VOLUME /dist \
       /src
WORKDIR /src
COPY src /src
COPY docker-deploy /usr/local/bin/deploy
COPY docker-entrypoint /usr/local/bin/entrypoint
ENTRYPOINT ["entrypoint"]
