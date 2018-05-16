FROM node:6

# Install emulator
RUN npm install -g @google-cloud/functions-emulator

# Install app
ARG PROJECT_ID=slack-drive
ARG PUBSUB_TOPIC=slack-drive
ENV PROJECT_ID=${PROJECT_ID} \
    PUBSUB_TOPIC=${PUBSUB_TOPIC}
VOLUME /src
WORKDIR /src
COPY src /src
RUN echo ${PROJECT_ID} | functions start && \
    functions deploy --projectId ${PROJECT_ID} --source publisher publishEvent --trigger-http && \
    functions deploy --projectId ${PROJECT_ID} --source consumer consumeEvent --trigger-topic=${PUBSUB_TOPIC}
COPY entrypoint /usr/local/bin
CMD ["entrypoint"]
