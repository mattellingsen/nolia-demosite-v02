#!/bin/bash

# Script to manually trigger stuck brain assembly jobs in production
# This is a one-time fix for the current stuck job

echo "🔧 Manually triggering stuck brain assembly in production..."

# Production URL
PROD_URL="https://main.d2l8hlr3sei3te.amplifyapp.com"

# First, check for stale pending jobs
echo "📋 Checking for stale PENDING jobs..."
curl -X GET "${PROD_URL}/api/jobs/trigger-pending" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "🚀 Triggering brain assembly for stale jobs..."

# Trigger processing of stale pending jobs
curl -X POST "${PROD_URL}/api/jobs/trigger-pending" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "✅ Script completed. Check the application to see if brain assembly has started."
echo ""
echo "If the job is still stuck, you can also try:"
echo "1. Direct brain assembly: curl -X POST '${PROD_URL}/api/procurement-brain/84a878e1-c988-45ef-a6d9-76bf40a469ff/assemble'"
echo "2. Check job status: curl '${PROD_URL}/api/admin/jobs/84a878e1-c988-45ef-a6d9-76bf40a469ff'"