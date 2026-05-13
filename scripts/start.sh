#!/bin/bash
echo "--- Starting projects with PM2 ---"

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "PM2 is not installed. Please install it with: npm install -g pm2"
    exit 1
fi

pm2 startOrReload ecosystem.config.js --update-env

echo "--- PM2 processes started/reloaded ---"
pm2 list
