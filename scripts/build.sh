#!/bin/bash
echo "--- Building projects ---"

echo "Building API..."
cd rrrbazar-api && npm run build && cd ..

echo "Building Admin..."
cd rrrbazar-admin && npm run build && cd ..

echo "Building Client..."
cd rrrbazar-client && npm run build && cd ..

echo "--- All projects built ---"
