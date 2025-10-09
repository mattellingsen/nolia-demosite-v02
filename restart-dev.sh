#!/bin/bash
# Restart dev server script - kills zombies and starts fresh on port 3000

echo "🔪 Killing all dev servers..."
lsof -ti:3000,3001,3002,3003 | xargs kill -9 2>/dev/null || true
sleep 1

echo "🔄 Refreshing AWS credentials..."
rm -f /tmp/.aws-sso-env-springload-dev.sh
source ./scripts/export-aws-creds.sh

echo "🚀 Starting dev server on port 3000..."
npm run dev
