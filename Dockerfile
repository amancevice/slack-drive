FROM node:6

# Install emulator
RUN npm install -g @google-cloud/functions-emulator

# Install app
ARG PROJECT_ID=slack-drive
ARG PUBSUB_TOPIC=slack-drive
ENV PROJECT_ID=${PROJECT_ID} \
    PUBSUB_TOPIC=${PUBSUB_TOPIC} \
    GOOGLE_APPLICATION_CREDENTIALS=/etc/cloud/client_secret.json
VOLUME /etc/cloud \
       /var/data
WORKDIR /slack-drive
COPY config.json index.js package.json ./
RUN npm install
CMD ["/bin/bash"]
