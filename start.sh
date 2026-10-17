#!/bin/sh
# Run ./start.sh to start Market Terminal.
cd "$(dirname "$0")" && node server.js --open
