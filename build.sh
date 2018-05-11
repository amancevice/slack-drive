#!/bin/bash

echo ${PROJECT_ID} | functions start
functions deploy slackEvent --trigger-http
