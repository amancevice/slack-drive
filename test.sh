#!/bin/bash

echo ${PROJECT_ID} | functions start
functions deploy slackEvent --trigger-http
sleep 5
for file in $(ls .examples/); do
  echo -e "\033[0;34m${file}\033[0m"
  functions call slackEvent --file .examples/${file}
  functions logs read
  functions logs clear
  echo
done
