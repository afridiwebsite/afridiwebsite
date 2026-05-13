#!/bin/bash

# Make scripts executable
chmod +x scripts/install.sh
chmod +x scripts/build.sh
chmod +x scripts/start.sh

# Run install
./scripts/install.sh

# Run build
./scripts/build.sh

# Run start
./scripts/start.sh
