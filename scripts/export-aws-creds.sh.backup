#!/bin/bash

# Export AWS SSO Credentials as Environment Variables
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
    echo "🔐 Checking AWS SSO session for profile: $PROFILE"

    # Check if SSO session is valid
    if ! aws sts get-caller-identity --profile "$PROFILE" >/dev/null 2>&1; then
        echo "📝 SSO session expired. Please complete the login in your browser..."
        aws sso login --profile "$PROFILE"

        # Wait a moment for the login to complete
        sleep 2
    fi

    echo "🔄 Fetching temporary credentials..."

    # Get temporary credentials using process format (JSON output)
    CREDS_JSON=$(aws configure export-credentials --profile "$PROFILE" --format process)

    if [ $? -ne 0 ]; then
        echo "❌ Failed to export credentials. Please try logging in again:"
        echo "   aws sso login --profile $PROFILE"
        return 1
    fi

    # Parse JSON and extract values (handle both quoted and unquoted keys)
    ACCESS_KEY=$(echo "$CREDS_JSON" | grep -o '"AccessKeyId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)"/\1/')
    SECRET_KEY=$(echo "$CREDS_JSON" | grep -o '"SecretAccessKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)"/\1/')
    SESSION_TOKEN=$(echo "$CREDS_JSON" | grep -o '"SessionToken"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)"/\1/')

    # Create export commands
    cat > "$CACHE_FILE" << EOF
# AWS Credentials for profile: $PROFILE
# Generated at: $(date)
# Valid until: $(echo "$CREDS_JSON" | grep -o '"Expiration"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)"/\1/')

export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"
export AWS_SESSION_TOKEN="$SESSION_TOKEN"
export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
export NOLIA_AWS_REGION="${NOLIA_AWS_REGION:-ap-southeast-2}"

# Unset AWS_PROFILE to prevent SDK from trying to use SSO directly
unset AWS_PROFILE

echo "✅ AWS credentials exported successfully!"
echo "📍 Region: \$AWS_REGION"
echo "⏰ Valid until: $(echo "$CREDS_JSON" | grep -o '"Expiration"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)"/\1/' | cut -d'T' -f2 | cut -d'+' -f1) UTC"
EOF

    echo "✨ Credentials cached for faster future use"
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