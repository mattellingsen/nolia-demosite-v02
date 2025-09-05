# RAG-Enhanced AI Assessment System - Deployment Guide

This guide covers deploying the complete RAG (Retrieval-Augmented Generation) system for AI-powered funding application assessment.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │    │  AWS Bedrock    │    │  OpenSearch     │
│   (Frontend)    │◄──►│   (Claude AI)   │    │ (Vector Store)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AWS Amplify   │    │     AWS S3      │    │   PostgreSQL    │
│   (Hosting)     │    │ (File Storage)  │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Step 1: Prerequisites

### Required AWS Services
- ✅ AWS Amplify (already set up)
- ✅ Amazon RDS PostgreSQL (already set up)
- ✅ Amazon S3 (already set up)
- 🆕 **Amazon OpenSearch Service**
- 🆕 **Amazon Bedrock**

### Required API Keys
- ✅ AWS credentials (already configured)
- 🆕 **OpenAI API key** (for embeddings)

## Step 2: Set Up Amazon OpenSearch Service

### Option A: Using AWS Console

1. **Navigate to OpenSearch Service**
   ```
   AWS Console → OpenSearch Service → Create domain
   ```

2. **Configure Domain**
   - Domain name: `nolia-funding-rag`
   - Deployment: `Development and testing`
   - Version: `OpenSearch 2.5+`
   - Instance: `t3.small.search`
   - Storage: `20 GB GP3`

3. **Network & Security**
   - Access: `VPC access` (recommended)
   - Master user: `admin` / `[strong-password]`
   - Encryption: Enable all encryption options

4. **Wait for Creation** (~15-20 minutes)

### Option B: Using AWS CLI

```bash
aws opensearch create-domain \
    --domain-name nolia-funding-rag \
    --engine-version OpenSearch_2.5 \
    --cluster-config \
        InstanceType=t3.small.search,InstanceCount=1 \
    --ebs-options \
        EBSEnabled=true,VolumeType=gp3,VolumeSize=20 \
    --advanced-security-options \
        Enabled=true,InternalUserDatabaseEnabled=true,MasterUserOptions='{MasterUserName=admin,MasterUserPassword=YourStrongPassword123!}' \
    --encryption-at-rest-options Enabled=true \
    --node-to-node-encryption-options Enabled=true \
    --domain-endpoint-options EnforceHTTPS=true
```

## Step 3: Enable Amazon Bedrock

1. **Navigate to Bedrock Service**
   ```
   AWS Console → Bedrock → Model access
   ```

2. **Request Model Access**
   - Find `Anthropic Claude 3 Sonnet`
   - Click "Request model access"
   - Fill out the form (usually approved within minutes)

3. **Verify Access**
   - Status should show "Available"

## Step 4: Get OpenAI API Key

1. **Visit OpenAI Platform**
   ```
   https://platform.openai.com/api-keys
   ```

2. **Create New Key**
   - Name: `Nolia Embeddings`
   - Permissions: All or restricted to embeddings

3. **Add Credits** (if needed)
   - Minimum $10 recommended for testing

## Step 5: Update Environment Variables

Add these to your AWS Amplify environment variables:

### In AWS Amplify Console → Environment Variables

```bash
# RAG Configuration
OPENSEARCH_ENDPOINT=https://search-nolia-funding-rag-[random].us-east-1.es.amazonaws.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourStrongPassword123!

# OpenAI for Embeddings
OPENAI_API_KEY=sk-your-openai-api-key-here

# Admin API Key for system initialization
ADMIN_API_KEY=your-secure-admin-key-for-rag-init
```

## Step 6: Deploy Updated Code

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add RAG implementation with AWS Bedrock and OpenSearch"
   git push origin main
   ```

2. **Wait for Deployment**
   - AWS Amplify will automatically deploy
   - Watch build logs for any errors

## Step 7: Initialize RAG System

1. **Test Health Check**
   ```bash
   curl https://your-app-url.amplifyapp.com/api/health/rag
   ```

2. **Initialize System** (replace with your admin key)
   ```bash
   curl -X POST \
     -H "Authorization: Bearer your-secure-admin-key-for-rag-init" \
     https://your-app-url.amplifyapp.com/api/admin/initialize-rag
   ```

3. **Run Test Suite**
   ```bash
   node test-rag-implementation.js
   ```

## Step 8: Test RAG Functionality

### Test Single Assessment
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "applicationText": "Our AI startup is seeking $500K for product development...",
    "fundId": "test-fund-123",
    "assessmentType": "scoring"
  }' \
  https://your-app-url.amplifyapp.com/api/ai/assess-application
```

### Test Batch Assessment
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "applications": [
      {"id": "app-1", "text": "Tech startup seeking funding..."},
      {"id": "app-2", "text": "Manufacturing company requesting..."}
    ],
    "fundId": "test-fund-123"
  }' \
  https://your-app-url.amplifyapp.com/api/ai/batch-assess
```

## Step 9: Cost Monitoring

### Expected Monthly Costs
- OpenSearch t3.small: ~$25/month
- Bedrock Claude usage: ~$3-8/1K tokens
- OpenAI embeddings: ~$0.10/1M tokens
- **Total estimated: $30-50/month** for moderate usage

### Set Up Billing Alerts
1. AWS Console → Billing → Billing Preferences
2. Enable billing alerts
3. Set alerts at $10, $25, $50 thresholds

## Step 10: Production Considerations

### Security Enhancements
- [ ] Implement proper IAM roles instead of access keys
- [ ] Use AWS Secrets Manager for sensitive values
- [ ] Set up VPC endpoints for service communication
- [ ] Enable AWS CloudTrail for audit logging

### Performance Optimization
- [ ] Monitor OpenSearch performance
- [ ] Implement caching for frequent embeddings
- [ ] Set up CloudWatch dashboards
- [ ] Configure auto-scaling for high load

### Backup & Recovery
- [ ] Enable OpenSearch automated snapshots
- [ ] Set up RDS automated backups
- [ ] Document disaster recovery procedures

## Troubleshooting

### Common Issues

1. **OpenSearch connection failed**
   - Check security group rules
   - Verify endpoint URL
   - Confirm master user credentials

2. **Bedrock access denied**
   - Ensure model access is approved
   - Check IAM permissions
   - Verify region configuration

3. **OpenAI API errors**
   - Check API key validity
   - Verify billing account status
   - Monitor rate limits

### Debug Commands

```bash
# Check all services
curl https://your-app.amplifyapp.com/api/health/rag

# Test database connection
curl https://your-app.amplifyapp.com/api/health

# View application logs
aws logs filter-log-events --log-group-name /aws/amplify/your-app
```

## Support & Next Steps

### Phase 1 Complete ✅
- RAG system deployed and operational
- AI assessment APIs available
- Health monitoring in place

### Phase 2 Roadmap 🚀
- Frontend integration with assessment APIs
- Document upload and processing UI
- Batch assessment dashboard
- Real-time assessment feedback

### Getting Help
- Check health endpoints first
- Review AWS service logs
- Test individual components
- Monitor cost and usage

---

**🎉 Congratulations!** Your RAG-enhanced AI assessment system is now deployed and ready to prevent LLM hallucination through retrieval-augmented generation.