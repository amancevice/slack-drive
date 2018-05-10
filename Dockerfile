FROM node:6
ARG PROJECT_ID=slack-drive
ENV PROJECT_ID=${PROJECT_ID} \
    ENDPOINT=http://localhost:8010/${PROJECT_ID}/us-central1/slackEvent
RUN npm install -g @google-cloud/functions-emulator && \
    functions config set projectId ${PROJECT_ID}
WORKDIR /slack-drive
CMD ["/bin/bash"]
