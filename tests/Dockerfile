FROM node:6
RUN npm install -g @google-cloud/functions-emulator
ARG PROJECT_ID=slack-drive
ARG PUBSUB_TOPIC=slack-drive-events
ENV PROJECT_ID=${PROJECT_ID} PUBSUB_TOPIC=${PUBSUB_TOPIC}
VOLUME /dist /src
WORKDIR /src
COPY bin /usr/local/bin
ENTRYPOINT ["entrypoint"]
