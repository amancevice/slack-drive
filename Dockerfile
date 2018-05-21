FROM node:6
RUN npm install -g @google-cloud/functions-emulator
ARG PROJECT_ID=slack-drive
ARG PUBSUB_TOPIC=slack-drive
ENV PROJECT_ID=${PROJECT_ID} PUBSUB_TOPIC=${PUBSUB_TOPIC}
VOLUME /dist /src
WORKDIR /src
COPY docker-deploy /usr/local/bin/deploy
COPY docker-entrypoint /usr/local/bin/entrypoint
ENTRYPOINT ["entrypoint"]
