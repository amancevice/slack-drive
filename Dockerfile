FROM node:6
RUN npm install -g \
        @google-cloud/functions-emulator@1.0.0-beta.4 \
        gulp-cli@2.0.1
ARG PROJECT_ID=slack-drive
ARG PUBSUB_TOPIC=slack-drive-events
ENV PROJECT_ID=${PROJECT_ID} PUBSUB_TOPIC=${PUBSUB_TOPIC}
WORKDIR /slack-drive
COPY package.json package-lock.json /slack-drive/
RUN npm install
COPY gulpfile.js /slack-drive/
VOLUME /slack-drive/src
CMD ["/bin/bash"]
