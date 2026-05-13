#!/bin/bash
echo "--- Installing dependencies ---"

echo "Installing API dependencies..."
cd rrrbazar-api && npm install && cd ..

echo "Installing Admin dependencies..."
cd rrrbazar-admin && npm install && cd ..

echo "Installing Client dependencies..."
cd rrrbazar-client && npm install && cd ..

echo "--- All dependencies installed ---"
