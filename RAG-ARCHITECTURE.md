# Complete RAG Architecture - Procurement Admin System

## Overview
This document maps the **actual implemented architecture** for the procurement-admin RAG (Retrieval-Augmented Generation) system.

---

## Architecture Flow

```
┌─────────────┐
│   Browser   │ User uploads documents via /procurement-admin/setup
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────────────────────┐
│  AWS Amplify (Next.js Serverless Functions)             │
│                                                          │
│  /api/procurement-base/create-async                     │
│  - Receives base64-encoded documents                    │
│  - Creates PostgreSQL record                            │
│  - Uploads files to S3                                  │
│  - Queues job in SQS                                    │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┬──────────────┬─────────────┐
        │                   │              │             │
        ▼                   ▼              ▼             ▼
   ┌─────────┐      ┌──────────┐    ┌─────────┐   ┌──────────┐
   │   S3    │      │ SQS Queue│    │PostgreSQL│   │OpenSearch│
   │  Docs   │      │ (Jobs)   │    │ (Prisma) │   │ (Vectors)│
   └─────────┘      └────┬─────┘    └─────────┘   └──────────┘
                         │
                         │ Triggers background processing
                         ▼
   ┌──────────────────────────────────────────────────┐
   │  Background Job Processor                        │
   │  /api/jobs/process (auto-polling)                │
   │                                                   │
   │  1. Fetch job from database                      │
   │  2. Download docs from S3                        │
   │  3. Extract text (PDF/DOCX parsing)              │
   │  4. Call Bedrock for document analysis           │
   │  5. Generate embeddings via Bedrock              │
   │  6. Store vectors in OpenSearch                  │
   │  7. Update job progress in PostgreSQL            │
   └──────────┬────────────────────────────────────────┘
              │
              │ When all docs processed
              ▼
   ┌──────────────────────────────────────┐
   │  /api/procurement-brain/assemble     │
   │  - Finalizes RAG knowledge base      │
   │  - Creates OpenSearch index          │
   │  - Updates base status to ACTIVE     │
   └──────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (Browser)
**Location:** `/procurement-admin/setup/setup-procurement-base`

**Flow:**
1. User uploads documents (drag & drop or file picker)
2. Files converted to base64 in browser
3. Progress modal shows conversion status
4. POST request to API with base64 payloads
5. Redirect to status tracking page

**Key Files:**
- `src/app/procurement-admin/setup/setup-procurement-base/page.tsx`
- `src/app/procurement-admin/setup/setup-procurement-base/components/step-1-upload-policies.tsx`

---

### 2. API Gateway (Amplify Serverless)
**Location:** `/api/procurement-base/create-async`

**Responsibilities:**
- Validate knowledgebase name uniqueness
- Create PostgreSQL record (Fund table with moduleType='PROCUREMENT_ADMIN')
- Upload documents to S3 with UUID-prefixed keys
- Create database records for each document
- Queue SQS message for background processing
- Return immediate response with job ID

**Key Operations:**
```typescript
1. Create Fund record → PostgreSQL
2. For each document:
   - Convert base64 → Buffer
   - Upload to S3: procurement-admin/{baseId}/{uuid}-{filename}
   - Create FundDocument record → PostgreSQL
3. Queue job → SQS (via sqsService.queueDocumentProcessing)
4. Return { baseId, jobId, documentsUploaded: N }
```

**AWS Services Used:**
- S3Client (document storage)
- SQS via sqsService (job queuing)
- Prisma (PostgreSQL ORM)

**File:** `src/app/api/procurement-base/create-async/route.ts`

---

### 3. Storage Layer

#### PostgreSQL (AWS RDS)
**Tables Used:**
- `Fund` - Knowledgebase metadata
  - id, name, description, status, moduleType='PROCUREMENT_ADMIN'
  - brainVersion, brainAssembledAt, openSearchIndex
- `FundDocument` - Document records
  - id, fundId, filename, s3Key, documentType, moduleType
- `BackgroundJob` - Job tracking
  - id, fundId, type, status, progress, errorMessage

#### S3 (AWS S3)
**Bucket:** `nolia-funding-documents-ap-southeast-2-599065966827`

**Structure:**
```
procurement-admin/
  {baseId}/
    {uuid}-document1.pdf
    {uuid}-document2.docx
```

**Credentials:** Uses getAWSCredentials() → IAM role in production

#### SQS (AWS Simple Queue Service)
**Queue:** `nolia-funding-processing` (ap-southeast-2)

**Message Format:**
```json
{
  "jobId": "uuid",
  "fundId": "uuid",
  "type": "DOCUMENT_ANALYSIS",
  "documents": [
    { "id": "uuid", "s3Key": "...", "filename": "..." }
  ]
}
```

**File:** `src/lib/sqs-service.ts`

---

### 4. Background Processing Layer

#### Job Processor
**Endpoint:** `/api/jobs/process`

**Trigger Methods:**
1. **Auto-polling:** Frontend status page polls every 3 seconds
2. **SQS trigger:** Lambda function processes SQS messages (future)
3. **Manual trigger:** POST to /api/jobs/process with jobId

**Processing Steps:**
```typescript
1. Fetch job from PostgreSQL (status=PENDING/PROCESSING)
2. For each document in job.metadata.documents:
   a. Download from S3 using s3Client.send(GetObjectCommand)
   b. Extract text using extractTextFromFile()
      - PDF → pdf-parse library
      - DOCX → mammoth library
   c. Analyze with Bedrock/Claude
      - Call claude-service.ts → analyzeDocument()
      - Extract key information, structure
   d. Generate embeddings via Bedrock
      - Call aws-bedrock.ts → generateEmbedding()
   e. Store in OpenSearch
      - Call aws-opensearch.ts → storeDocumentVector()
   f. Update job progress → PostgreSQL
3. When complete: Trigger brain assembly
```

**Files:**
- `src/app/api/jobs/process/route.ts` - Main processor
- `src/lib/background-job-service.ts` - Job management logic
- `src/utils/server-document-analyzer.ts` - Text extraction

---

### 5. AI Processing Layer

#### AWS Bedrock (Claude API)
**Models Used:**
- **Analysis:** `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Embeddings:** `amazon.titan-embed-text-v1` (via Bedrock)

**Operations:**
1. **Document Analysis:**
   ```typescript
   bedrockClient.send(InvokeModelCommand({
     modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
     body: { messages: [...], max_tokens: 4096 }
   }))
   ```

2. **Embedding Generation:**
   ```typescript
   bedrockClient.send(InvokeModelCommand({
     modelId: 'amazon.titan-embed-text-v1',
     body: { inputText: documentText }
   }))
   // Returns: 1536-dimensional vector
   ```

**Files:**
- `src/lib/claude-service.ts` - Claude 3.5 Sonnet interactions
- `src/lib/aws-bedrock.ts` - Bedrock embedding generation

**Credentials:** Uses getAWSCredentials() → IAM role

---

### 6. Vector Database (OpenSearch)

#### AWS OpenSearch Service
**Endpoint:** `search-nolia-funding-rag-*.ap-southeast-2.es.amazonaws.com`

**Index Structure:**
```
procurement-admin-documents
  - id: string
  - fundId: string
  - documentType: string
  - filename: string
  - content: text
  - embedding: dense_vector (1536 dimensions)
  - metadata: object
```

**Operations:**
1. **Index Creation:**
   ```typescript
   PUT /procurement-admin-documents
   {
     "mappings": {
       "properties": {
         "embedding": { "type": "dense_vector", "dims": 1536 },
         "content": { "type": "text" }
       }
     }
   }
   ```

2. **Document Storage:**
   ```typescript
   POST /procurement-admin-documents/_doc/{docId}
   {
     "fundId": "...",
     "content": "extracted text...",
     "embedding": [0.123, -0.456, ...],
     "metadata": {...}
   }
   ```

3. **Vector Search (Future - for RAG queries):**
   ```typescript
   POST /procurement-admin-documents/_search
   {
     "query": {
       "knn": {
         "embedding": {
           "vector": queryEmbedding,
           "k": 10
         }
       }
     }
   }
   ```

**File:** `src/lib/aws-opensearch.ts`

**Credentials:** Uses getAWSCredentials() → IAM role

---

## Data Flow Example

### Creating "Test KB 2025" with 2 Documents

```
1. BROWSER
   ✅ User uploads government-procurement-rules.docx (200KB)
   ✅ User uploads rfp-template.docx (75KB)
   ✅ Converts to base64
   ✅ POST /api/procurement-base/create-async

2. API ROUTE (create-async)
   ✅ Creates Fund record: id=abc-123, moduleType=PROCUREMENT_ADMIN
   ✅ Uploads doc1 to S3: procurement-admin/abc-123/{uuid}-government-procurement-rules.docx
   ✅ Uploads doc2 to S3: procurement-admin/abc-123/{uuid}-rfp-template.docx
   ✅ Creates FundDocument records (2)
   ✅ Queues SQS message with jobId=xyz-789
   ✅ Returns: { baseId: abc-123, jobId: xyz-789, documentsUploaded: 2 }

3. BROWSER (redirected to status page)
   ✅ Polls /api/procurement-base/abc-123/job-status every 3s
   ✅ Shows progress: "Processing 1 of 2 documents..." (50%)

4. BACKGROUND JOB PROCESSOR
   ✅ Fetches job xyz-789 from PostgreSQL
   ✅ Downloads doc1 from S3
   ✅ Extracts text (12,000 chars)
   ✅ Calls Bedrock Claude: analyzeDocument(text)
      → Returns: { sections: [...], keyRequirements: [...] }
   ✅ Calls Bedrock Embeddings: generateEmbedding(text)
      → Returns: [0.123, -0.456, ..., 0.789] (1536 dims)
   ✅ Stores in OpenSearch:
      POST /procurement-admin-documents/_doc/doc1-id
   ✅ Updates job: progress=50%, processedDocuments=1

   ✅ Downloads doc2 from S3
   ✅ Extracts text (5,000 chars)
   ✅ Calls Bedrock Claude + Embeddings
   ✅ Stores in OpenSearch
   ✅ Updates job: progress=100%, processedDocuments=2, status=COMPLETED

5. BRAIN ASSEMBLY
   ✅ POST /api/procurement-brain/abc-123/assemble
   ✅ Verifies all documents in OpenSearch
   ✅ Creates/updates OpenSearch index alias
   ✅ Updates Fund: status=ACTIVE, brainAssembledAt=now()

6. BROWSER (final status)
   ✅ Shows: "✅ COMPLETED - 2 of 2 documents processed"
   ✅ Knowledgebase ready for use
```

---

## Credential Management (Critical Fix)

### Production Credentials
All AWS SDK clients use:
```typescript
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

const client = new AwsClient({
  region: AWS_REGION,
  credentials: getAWSCredentials(),
});
```

### Credential Resolution (Production)
```
fromNodeProviderChain({ ignoreCache: true })
  ↓
1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
2. ECS container metadata (Amplify IAM role) ✅ USED IN PRODUCTION
3. EC2 instance metadata (fallback)

SKIPS:
❌ ~/.aws/config (SSO tokens)
❌ ~/.aws/credentials
❌ ~/.aws/sso/cache/
```

This prevents "The provided token has expired" errors.

---

## Key Files Reference

### API Routes
- `/api/procurement-base/create-async/route.ts` - Upload handler
- `/api/jobs/process/route.ts` - Background processor
- `/api/procurement-brain/[baseId]/assemble/route.ts` - Brain assembly

### Services
- `src/lib/aws-credentials.ts` - Centralized credential provider
- `src/lib/sqs-service.ts` - SQS queue management
- `src/lib/claude-service.ts` - Bedrock Claude API
- `src/lib/aws-bedrock.ts` - Bedrock embeddings
- `src/lib/aws-opensearch.ts` - OpenSearch operations
- `src/lib/background-job-service.ts` - Job processing logic

### Utilities
- `src/utils/server-document-analyzer.ts` - PDF/DOCX text extraction

---

## Monitoring & Debugging

### CloudWatch Logs
All services log to CloudWatch:
```
/aws/lambda/ssr-app-XXXXX
```

Search for:
- `DEBUG:` - Debug logging
- `✅` - Success operations
- `❌` - Errors
- `🔐` - Credential operations

### Status Tracking
Frontend polls: `/api/procurement-base/{baseId}/job-status`

Returns:
```json
{
  "status": "PROCESSING",
  "progress": 50,
  "processedDocuments": 1,
  "totalDocuments": 2,
  "message": "Processing document 1 of 2..."
}
```

---

## Production Deployment

**Platform:** AWS Amplify (Sydney - ap-southeast-2)
**URL:** https://main.d2l8hlr3sei3te.amplifyapp.com

**Deployment Process:**
1. Push to GitHub main branch
2. Amplify auto-builds Next.js app (~2-3 minutes)
3. Deploys as serverless functions
4. Functions have IAM role with S3/Bedrock/OpenSearch permissions

**Environment Variables (Amplify):**
- `DATABASE_URL` - PostgreSQL connection
- `S3_BUCKET_DOCUMENTS` - S3 bucket name
- `OPENSEARCH_ENDPOINT` - OpenSearch endpoint
- `SQS_QUEUE_URL` - SQS queue URL
- `NOLIA_AWS_REGION` - ap-southeast-2

---

## RAG vs Traditional Upload

### Traditional Upload
```
Browser → API → S3 → PostgreSQL
(Just stores files)
```

### RAG-Powered Upload (Our Implementation)
```
Browser → API → S3 + PostgreSQL + SQS
           ↓
  Background Job → Download S3
           ↓
  Text Extraction (PDF/DOCX parsing)
           ↓
  Bedrock Claude (document analysis)
           ↓
  Bedrock Embeddings (vector generation)
           ↓
  OpenSearch (vector storage + semantic search index)
           ↓
  Brain Assembly (finalization)
```

**Result:** Documents are now **semantically searchable** and can be used for **AI-powered retrieval** in assessment workflows.

---

## Future Enhancements

### Phase 1 (Complete) ✅
- Document upload
- Background processing
- Bedrock integration
- OpenSearch vector storage

### Phase 2 (Future)
- **RAG Queries:** Semantic search during procurement assessments
- **Auto-compliance:** Check submissions against knowledgebase
- **Smart recommendations:** Suggest relevant policies based on context
- **Multi-modal:** Support images, tables in documents

---

**Generated:** 2025-10-02
**Status:** ✅ Fully Implemented & Tested
**Last Updated:** After comprehensive credential fix (commit 6158dfa)
