#!/bin/bash

echo "🔧 Fixing AWS Credentials for V2 Assessment"
echo "==========================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   curl \"https://awscli.amazonaws.com/AWSCLIV2.pkg\" -o \"AWSCLIV2.pkg\""
    echo "   sudo installer -pkg AWSCLIV2.pkg -target /"
    exit 1
fi

echo "✅ AWS CLI is installed"

# Check current AWS configuration
echo ""
echo "🔍 Current AWS Configuration:"
aws configure list --profile springload-dev 2>/dev/null || echo "❌ No springload-dev profile found"

echo ""
echo "🔧 Setting up AWS SSO for springload-dev profile..."

# Configure AWS SSO
aws configure set sso_start_url "https://springloadpartners.awsapps.com/start" --profile springload-dev
aws configure set sso_region "ap-southeast-2" --profile springload-dev
aws configure set region "ap-southeast-2" --profile springload-dev
aws configure set output "json" --profile springload-dev

echo "✅ AWS SSO configuration updated"

echo ""
echo "🔑 Logging in to AWS SSO..."
echo "This will open your browser for authentication."
read -p "Press Enter to continue..."

# Login to AWS SSO
aws sso login --profile springload-dev

# Verify credentials
echo ""
echo "🔍 Verifying AWS credentials..."
if aws sts get-caller-identity --profile springload-dev; then
    echo "✅ AWS credentials are working!"

    echo ""
    echo "🧪 Testing AWS Bedrock access..."
    if aws bedrock list-foundation-models --region ap-southeast-2 --profile springload-dev > /dev/null 2>&1; then
        echo "✅ AWS Bedrock access confirmed!"
    else
        echo "⚠️  AWS Bedrock access may be limited. Check IAM permissions."
    fi

    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. The AWS credentials should now work"
    echo "2. Try the V2 assessment again at: https://main.d2l8hlr3sei3te.amplifyapp.com/funding/applications-upload"
    echo "3. If it still fails, check the browser console for specific error messages"

else
    echo "❌ AWS credentials verification failed"
    echo "Please check your SSO setup and try again"
    exit 1
fi