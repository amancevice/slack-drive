#!/bin/bash

echo ${PROJECT_ID} | functions start
functions deploy slackEvent --trigger-http
for file in $(ls .examples/); do
  echo
  functions logs clear
  functions call slackEvent --file ${file}
  functions logs read
done
