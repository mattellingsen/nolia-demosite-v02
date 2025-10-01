#!/bin/bash

# AWS SSO Credential Helper for Local Development
# This script automatically refreshes SSO credentials when needed
# It's designed to work with AWS SDK credential_process

set -e

PROFILE="${1:-springload-dev}"
CACHE_FILE="/tmp/.aws-sso-creds-${PROFILE}.json"
CACHE_DURATION=3300 # 55 minutes (less than 1 hour to ensure refresh before expiry)

# Function to check if cache is still valid
is_cache_valid() {
    if [ ! -f "$CACHE_FILE" ]; then
        return 1
    fi

    local file_age=$(( $(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || echo 0) ))
    if [ $file_age -gt $CACHE_DURATION ]; then
        return 1
    fi

    return 0
}

# Function to get fresh credentials
get_fresh_credentials() {
    # Check if SSO session is valid
    if ! aws sts get-caller-identity --profile "$PROFILE" >/dev/null 2>&1; then
        echo "SSO session expired. Logging in..." >&2
        aws sso login --profile "$PROFILE" >&2
    fi

    # Get temporary credentials
    aws configure export-credentials --profile "$PROFILE" --format json > "$CACHE_FILE"
}

# Main logic
if ! is_cache_valid; then
    get_fresh_credentials >&2
fi

# Output credentials in the format expected by credential_process
cat "$CACHE_FILE"