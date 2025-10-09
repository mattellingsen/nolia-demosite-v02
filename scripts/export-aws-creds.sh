#!/bin/bash

# Export AWS SSO Credentials as Environment Variables (FIXED VERSION)
# This script fetches SSO credentials and exports them for local development
# Usage: source ./scripts/export-aws-creds.sh

PROFILE="${1:-springload-dev}"
CACHE_FILE="/tmp/.aws-sso-env-${PROFILE}.sh"
CACHE_DURATION=10800 # 3 hours

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

# Function to get and export fresh credentials
export_fresh_credentials() {
    echo "🔐 Fetching fresh AWS SSO credentials for profile: $PROFILE"

    # Check if this profile uses a source_profile (role assumption)
    SOURCE_PROFILE=$(aws configure get source_profile --profile "$PROFILE" 2>/dev/null)

    if [ -n "$SOURCE_PROFILE" ]; then
        echo "📋 Profile uses source_profile: $SOURCE_PROFILE"
        echo "📝 Starting SSO login flow for source profile..."
        aws sso login --profile "$SOURCE_PROFILE"
    else
        echo "📝 Starting SSO login flow..."
        aws sso login --profile "$PROFILE"
    fi

    if [ $? -ne 0 ]; then
        echo "❌ SSO login failed. Please try again."
        return 1
    fi

    # Delete all CLI cache files to force fresh credential generation
    # This is necessary because AWS CLI caches assumed role credentials
    # and won't refresh them even after a fresh SSO login
    echo "🗑️  Clearing stale credential cache..."
    rm -f "$HOME/.aws/cli/cache"/*.json 2>/dev/null

    # Force AWS CLI to assume the role and create fresh credentials
    # This must happen AFTER clearing the cache
    echo "🔄 Requesting fresh credentials via role assumption..."
    aws sts get-caller-identity --profile "$PROFILE" > /dev/null 2>&1

    if [ $? -ne 0 ]; then
        echo "❌ Failed to assume role. SSO session may have expired."
        echo "   Please try running the script again."
        return 1
    fi

    # Wait for AWS CLI to write the new cache file (critical for success)
    echo "⏳ Waiting for credential cache to update..."
    sleep 5

    echo "📂 Reading credentials from AWS CLI cache..."

    # Find the most recent CLI cache file for our account (599065966827)
    # These files are created by aws sts get-caller-identity and contain the temporary credentials
    CLI_CACHE_DIR="$HOME/.aws/cli/cache"

    if [ ! -d "$CLI_CACHE_DIR" ]; then
        echo "❌ AWS CLI cache directory not found: $CLI_CACHE_DIR"
        echo "   This usually means aws sso login didn't complete successfully."
        return 1
    fi

    # Find the most recently modified cache file
    CACHE_JSON=$(ls -t "$CLI_CACHE_DIR"/*.json 2>/dev/null | head -1)

    if [ -z "$CACHE_JSON" ] || [ ! -f "$CACHE_JSON" ]; then
        echo "❌ No credential cache files found in $CLI_CACHE_DIR"
        echo "   Please ensure 'aws sso login' completed successfully."
        return 1
    fi

    echo "📂 Reading from cache file: $(basename $CACHE_JSON)"

    # Check if jq is available for JSON parsing
    if ! command -v jq &> /dev/null; then
        echo "❌ jq is not installed. Please install it:"
        echo "   brew install jq"
        return 1
    fi

    # Extract credentials from cache file
    # The cache structure is: {"Credentials": {"AccessKeyId": "...", ...}}
    ACCESS_KEY=$(cat "$CACHE_JSON" | jq -r '.Credentials.AccessKeyId // empty' 2>/dev/null)
    SECRET_KEY=$(cat "$CACHE_JSON" | jq -r '.Credentials.SecretAccessKey // empty' 2>/dev/null)
    SESSION_TOKEN=$(cat "$CACHE_JSON" | jq -r '.Credentials.SessionToken // empty' 2>/dev/null)
    EXPIRATION=$(cat "$CACHE_JSON" | jq -r '.Credentials.Expiration // empty' 2>/dev/null)

    # Verify we got all required credentials
    if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ] || [ -z "$SESSION_TOKEN" ]; then
        echo "❌ Failed to extract credentials from cache file"
        echo "   Cache file may have unexpected format."
        echo "   Try running: aws sso login --profile $PROFILE"
        return 1
    fi

    # Verify these are temporary credentials (should start with ASIA)
    if [[ ! "$ACCESS_KEY" =~ ^ASIA ]]; then
        echo "⚠️  Warning: Credentials don't appear to be temporary (should start with ASIA)"
        echo "   Found: ${ACCESS_KEY:0:4}..."
    fi

    # Create export commands
    cat > "$CACHE_FILE" << EOF
# AWS Credentials for profile: $PROFILE
# Generated at: $(date)
# Valid until: $EXPIRATION

export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"
export AWS_SESSION_TOKEN="$SESSION_TOKEN"
export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
export NOLIA_AWS_REGION="${NOLIA_AWS_REGION:-ap-southeast-2}"

# Unset AWS_PROFILE to prevent SDK from trying to use SSO directly
unset AWS_PROFILE

echo "✅ AWS credentials exported successfully!"
echo "📍 Region: \$AWS_REGION"
echo "🔑 Access Key: ${ACCESS_KEY:0:8}... (temporary ASIA credentials)"
echo "⏰ Valid until: $EXPIRATION"
EOF

    echo "✨ Credentials cached for faster future use (valid for 3 hours)"
}

# Main execution
if is_cache_valid; then
    echo "♻️  Using cached credentials (still valid)"
else
    export_fresh_credentials
    if [ $? -ne 0 ]; then
        return 1
    fi
fi

# Source the cached credentials
source "$CACHE_FILE"
