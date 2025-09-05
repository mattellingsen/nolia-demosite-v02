# AWS OpenSearch Service Setup Guide

This guide will help you set up the AWS OpenSearch Service cluster for the RAG implementation.

## Step 1: Create OpenSearch Cluster via AWS Console

1. **Navigate to OpenSearch Service**
   - Go to AWS Console → OpenSearch Service
   - Click "Create domain"

2. **Domain Configuration**
   - Domain name: `nolia-funding-rag`
   - Deployment option: `Development and testing` (for now)
   - Version: `OpenSearch 2.5` or later
   - Data instance type: `t3.small.search` (minimum for testing)
   - Number of data nodes: `1`
   - Storage type: `General Purpose (SSD)`
   - Storage size: `20 GB` (minimum)

3. **Network Configuration**
   - Network: `VPC access` (recommended for security)
   - VPC: Select your existing VPC or create new
   - Security group: Create new or use existing
   - Subnets: Select private subnets

4. **Security Configuration**
   - Access policy: `Domain level access policy`
   - Enable fine-grained access control: `Yes`
   - Create master user: `Yes`
   - Master username: `admin`
   - Master password: Use a strong password

5. **Advanced Settings**
   - Enable encryption: `Yes` (both at rest and in transit)
   - Enable node-to-node encryption: `Yes`

## Step 2: Configure Security Group

Add inbound rules to allow HTTPS traffic:
- Type: `HTTPS`
- Protocol: `TCP`
- Port: `443`
- Source: Your application's security group or VPC CIDR

## Step 3: Update Environment Variables

Add these to your `.env.production`:

```bash
# OpenSearch Configuration
OPENSEARCH_ENDPOINT=https://search-nolia-funding-rag-xxxxx.us-east-1.es.amazonaws.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your-master-password
```

## Step 4: Initialize the Index

The index will be created automatically when the first document is stored, but you can also initialize it manually using the initialization function.

## Alternative: Quick Setup via AWS CLI

```bash
# Create OpenSearch domain
aws opensearch create-domain \
    --domain-name nolia-funding-rag \
    --engine-version OpenSearch_2.5 \
    --cluster-config \
        InstanceType=t3.small.search,InstanceCount=1,DedicatedMasterEnabled=false \
    --ebs-options \
        EBSEnabled=true,VolumeType=gp3,VolumeSize=20 \
    --access-policies '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "*"
                },
                "Action": "es:*",
                "Resource": "arn:aws:es:*:*:domain/nolia-funding-rag/*"
            }
        ]
    }' \
    --advanced-security-options \
        Enabled=true,InternalUserDatabaseEnabled=true,MasterUserOptions='{MasterUserName=admin,MasterUserPassword=YourPassword123!}' \
    --domain-endpoint-options \
        EnforceHTTPS=true,TLSSecurityPolicy=Policy-Min-TLS-1-2-2019-07 \
    --encryption-at-rest-options \
        Enabled=true \
    --node-to-node-encryption-options \
        Enabled=true
```

## Expected Timeline

- Domain creation: 15-20 minutes
- Index initialization: Automatic on first document upload

## Cost Estimate

- t3.small.search instance: ~$24/month
- 20GB storage: ~$2/month
- Total estimated cost: ~$26/month for development/testing

## Next Steps

1. Create the domain using one of the methods above
2. Wait for domain to become active (15-20 minutes)
3. Update your environment variables with the endpoint
4. Test the connection by uploading a document and verifying RAG functionality