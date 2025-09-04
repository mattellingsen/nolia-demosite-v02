# Claude.md - AI-Powered Procurement & Funding Application System v3

## Project Overview

A modular monolith application starting with funding/grant management (MVP) and expanding to procurement in Phase 2 (Month 9). The system provides three core workflows for the funding module: Create (configure programs), Apply (embeddable forms), and Assess (manual evaluation with structured scoring).

**Critical Constraints (Aligned with PRD v2.0):**
- MVP deadline: 24 weeks (6 months)
- Budget: $330K
- Team: 6.5 people (1 Technical Lead, 2 Full-Stack, 1 Frontend, 0.5 QA, 0.5 PM, Designer contractor 20hrs/week)
- Must handle 100+ applications by Month 6
- Page load < 2 seconds
- API response < 500ms p95
- Target: 2 paying customers, 10+ programs, 100+ applications processed

## 1. MVP Technical Stack (Funding Module Only)

### Frontend Dependencies

```json
{
  "dependencies": {
    "react": "18.2.0",
    "typescript": "5.3.3",
    "@untitledui/react": "latest",
    "tailwindcss": "3.4.1",
    "vite": "5.0.10",
    "react-router-dom": "6.20.1",
    "@tanstack/react-query": "5.12.2",
    "@auth0/react": "2.2.4",
    "zustand": "4.4.7",
    "axios": "1.6.2",
    "zod": "3.22.4",
    "react-hook-form": "7.48.2",
    "@hookform/resolvers": "3.3.2",
    "date-fns": "3.0.6",
    "dompurify": "3.0.8"
  },
  "devDependencies": {
    "@types/react": "18.2.45",
    "@vitejs/plugin-react": "4.2.1",
    "eslint": "8.56.0",
    "prettier": "3.1.1",
    "vitest": "1.1.0",
    "@testing-library/react": "14.1.2"
  }
}
```

### Backend Dependencies (MVP)

```json
{
  "dependencies": {
    "express": "4.18.2",
    "@prisma/client": "5.7.1",
    "prisma": "5.7.1",
    "jsonwebtoken": "9.0.2",
    "bcryptjs": "2.4.3",
    "helmet": "7.1.0",
    "cors": "2.8.5",
    "express-rate-limit": "7.1.5",
    "bullmq": "5.1.1",
    "ioredis": "5.3.2",
    "multer": "1.4.5-lts.1",
    "@aws-sdk/client-s3": "3.478.0",
    "@aws-sdk/s3-request-presigner": "3.478.0",
    "@sendgrid/mail": "8.1.0",
    "stripe": "14.10.0",
    "winston": "3.11.0",
    "dotenv": "16.3.1"
  },
  "devDependencies": {
    "@types/node": "20.10.0",
    "@types/express": "4.17.21",
    "tsx": "4.6.2",
    "nodemon": "3.0.2"
  }
}
```

## 2. MVP Database Schema (Funding Only)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// MVP ENUMS
enum UserRole {
  ADMIN
  ASSESSOR
  VIEWER
}

enum ProgramStatus {
  DRAFT
  ACTIVE
  CLOSED
}

enum ApplicationStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  REJECTED
}

// MVP TABLES
model Organization {
  id                String   @id @default(uuid())
  name              String
  subscriptionTier  String   @default("STARTER") // STARTER, PRO, ENTERPRISE
  subscriptionStatus String  @default("TRIALING")
  stripeCustomerId  String?  @unique
  settings          Json     @default("{}")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  users       User[]
  programs    Program[]
  auditLogs   AuditLog[]
}

model User {
  id             String    @id @default(uuid())
  organizationId String
  email          String    @unique
  passwordHash   String?
  auth0Id        String?   @unique
  role           UserRole
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  organization   Organization @relation(fields: [organizationId], references: [id])
  programs       Program[]    @relation("CreatedPrograms")
  assessments    Assessment[]
  auditLogs      AuditLog[]
  
  @@index([organizationId])
  @@index([email])
}

model Program {
  id             String        @id @default(uuid())
  organizationId String
  name           String
  description    String?
  budget         Decimal       @db.Decimal(15, 2)
  criteria       Json          // Eligibility and scoring rules
  status         ProgramStatus @default(DRAFT)
  startDate      DateTime?
  endDate        DateTime?
  createdById    String
  embedCode      String?       @db.Text
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  organization   Organization  @relation(fields: [organizationId], references: [id])
  createdBy      User         @relation("CreatedPrograms", fields: [createdById], references: [id])
  applications   Application[]
  
  @@index([organizationId])
  @@index([status])
}

model Application {
  id                String            @id @default(uuid())
  programId         String
  applicantEmail    String
  organizationName  String
  status            ApplicationStatus @default(DRAFT)
  submissionData    Json
  submittedAt       DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  program           Program           @relation(fields: [programId], references: [id])
  documents         Document[]
  assessments       Assessment[]
  
  @@index([programId])
  @@index([status])
  @@index([applicantEmail])
}

model Assessment {
  id            String    @id @default(uuid())
  applicationId String
  assessorId    String
  scores        Json
  comments      String?   @db.Text
  status        String    @default("DRAFT") // DRAFT, SUBMITTED
  submittedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  application   Application @relation(fields: [applicationId], references: [id])
  assessor      User        @relation(fields: [assessorId], references: [id])
  
  @@index([applicationId])
}

model Document {
  id            String   @id @default(uuid())
  applicationId String
  filename      String
  s3Key         String
  fileSize      Int
  mimeType      String
  uploadedAt    DateTime @default(now())
  
  application   Application @relation(fields: [applicationId], references: [id])
  
  @@index([applicationId])
}

model AuditLog {
  id            String   @id @default(uuid())
  organizationId String?
  userId        String?
  action        String
  resourceType  String
  resourceId    String?
  metadata      Json?
  createdAt     DateTime @default(now())
  
  organization  Organization? @relation(fields: [organizationId], references: [id])
  user          User?        @relation(fields: [userId], references: [id])
  
  @@index([organizationId])
  @@index([userId])
  @@index([createdAt])
}
```

## 3. MVP Environment Variables

```bash
# .env.example - MVP REQUIRED ONLY

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/funding_db"
REDIS_URL="redis://localhost:6379"

# Auth0 (Required)
AUTH0_DOMAIN="your-tenant.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-client-secret"
AUTH0_AUDIENCE="https://api.yourapp.com"

# AWS (Required)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="funding-documents"

# Stripe (Required)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_STARTER="price_..."
STRIPE_PRICE_ID_PRO="price_..."

# Email (Required)
SENDGRID_API_KEY="SG...."
FROM_EMAIL="noreply@yourapp.com"

# Application
NODE_ENV="development"
PORT="3000"
CLIENT_URL="http://localhost:5173"
API_URL="http://localhost:3000"
JWT_SECRET="your-jwt-secret-min-32-chars"

# Monitoring (Optional for MVP)
SENTRY_DSN=""
LOG_LEVEL="info"

# ========== PHASE 2 (Month 7+) - DO NOT USE IN MVP ==========
# NORDIGEN_SECRET_ID=""
# NORDIGEN_SECRET_KEY=""
# OPENAI_API_KEY=""
```

## 4. MVP File Structure

```
project-root/
├── apps/
│   ├── web/                    # React Frontend
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Untitled UI wrappers
│   │   │   │   ├── layout/
│   │   │   │   └── shared/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   └── funding/    # MVP Focus
│   │   │   │       ├── create/
│   │   │   │       ├── apply/
│   │   │   │       └── assess/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── store/
│   │   │   └── types/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── api/                    # Express Backend
│       ├── src/
│       │   ├── index.ts
│       │   ├── app.ts
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── middleware/
│       │   └── utils/
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
├── packages/
│   └── embed-widget/           # Embeddable form
└── docs/
```

## 5. Core Implementation Patterns (MVP)

### Auth0 Integration (Correct for React/Vite)

```typescript
// apps/web/src/features/auth/AuthProvider.tsx
import { Auth0Provider, useAuth0 } from '@auth0/react';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: "openid profile email",
      }}
      cacheLocation="localstorage"
    >
      <AuthSync>{children}</AuthSync>
    </Auth0Provider>
  );
};

const AuthSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const { setAuth, clearAuth } = useAuthStore();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      getAccessTokenSilently().then(token => {
        setAuth({
          user: {
            id: user.sub!,
            email: user.email!,
            name: user.name || user.email!,
            role: user['https://yourapp.com/roles']?.[0] || 'VIEWER',
          },
          token,
        });
      }).catch(console.error);
    } else if (!isLoading && !isAuthenticated) {
      clearAuth();
    }
  }, [isAuthenticated, user, isLoading]);
  
  return <>{children}</>;
};
```

### File Upload Service (MVP)

```typescript
// apps/api/src/services/upload.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
    }
  },
});

export class UploadService {
  async uploadDocument(file: Express.Multer.File, applicationId: string) {
    const key = `applications/${applicationId}/${crypto.randomUUID()}-${file.originalname}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    
    return prisma.document.create({
      data: {
        applicationId,
        filename: file.originalname,
        s3Key: key,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }
  
  async getDownloadUrl(documentId: string): Promise<string> {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');
    
    return getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: doc.s3Key,
    }), { expiresIn: 3600 });
  }
}
```

### Embed Widget (MVP)

```typescript
// packages/embed-widget/src/widget.ts
class FundingApplicationWidget {
  private iframe: HTMLIFrameElement;
  
  constructor(containerId: string, config: { programId: string; apiUrl: string }) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Container not found');
    
    this.iframe = document.createElement('iframe');
    this.iframe.src = `${config.apiUrl}/embed/${config.programId}`;
    this.iframe.style.width = '100%';
    this.iframe.style.height = '600px';
    this.iframe.style.border = 'none';
    
    container.appendChild(this.iframe);
  }
}

// Embed code generator for programs
export function generateEmbedCode(programId: string): string {
  return `
<div id="funding-form"></div>
<script src="${process.env.CLIENT_URL}/widget.js"></script>
<script>
  new FundingApplicationWidget('funding-form', {
    programId: '${programId}',
    apiUrl: '${process.env.API_URL}'
  });
</script>`.trim();
}
```

## 6. MVP API Endpoints (Per PRD)

```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/reset-password

// Programs
GET    /api/programs
POST   /api/programs
GET    /api/programs/:id
PUT    /api/programs/:id
DELETE /api/programs/:id
POST   /api/programs/:id/publish

// Applications
GET    /api/applications
POST   /api/applications
GET    /api/applications/:id
PUT    /api/applications/:id
POST   /api/applications/:id/submit
POST   /api/applications/:id/documents

// Assessments
GET    /api/assessments
POST   /api/assessments
GET    /api/assessments/:id
PUT    /api/assessments/:id
POST   /api/assessments/:id/submit

// Billing
GET    /api/billing/subscription
PUT    /api/billing/subscription
GET    /api/billing/invoices
POST   /api/billing/payment-method
```

## 7. State Management (Zustand)

```typescript
// apps/web/src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ASSESSOR' | 'VIEWER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (data: { user: User; token: string }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: ({ user, token }) => set({
        user,
        token,
        isAuthenticated: true,
      }),
      
      clearAuth: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
      }),
    }),
    { name: 'auth-storage' }
  )
);
```

## 8. API Client

```typescript
// apps/web/src/lib/api-client.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## 9. MVP Deployment Strategy

### Local Development
```yaml
# docker-compose.yml (development only)
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: funding_db
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Production (MVP - Simple)
- **Frontend:** AWS S3 + CloudFront
- **Backend:** AWS ECS (single task)
- **Database:** AWS RDS PostgreSQL
- **Cache:** AWS ElastiCache Redis
- **Files:** AWS S3

## 10. Implementation Timeline (Per PRD)

### Months 1-2: Foundation
- **Sprint 1-2:** Auth0 setup, database schema
- **Sprint 3-4:** Core CRUD operations

### Months 3-4: Application Flow
- **Sprint 5-6:** Form builder (using library), embed generation
- **Sprint 7-8:** Assessment workflow

### Months 5-6: Production Ready
- **Sprint 9-10:** Stripe, notifications
- **Sprint 11-12:** Testing, launch prep

## 11. Success Metrics (MVP - Month 6)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Paying Customers | 2+ | Stripe |
| Applications | 100+ | Database |
| Programs Created | 10+ | Database |
| Uptime | 95%+ | StatusPage |
| Page Load | <2s | PageSpeed |
| Critical Bugs | 0 | Sentry |

## 12. Phase 2 Features (Month 7-12) - NOT IN MVP

The following are documented for future implementation:

- **Month 7-8:** AI document validation (OpenAI integration)
- **Month 9:** Procurement module launch
- **Month 10:** Banking verification (Nordigen)
- **Month 11:** Advanced analytics
- **Month 12:** API access for customers

## Important Notes

1. **Untitled UI:** Use `@untitledui/react` with "latest" tag, verify actual version during setup
2. **Focus:** MVP is funding module only - no procurement code
3. **Team:** 6.5 people total, not just 4 developers
4. **Timeline:** 24 weeks for MVP
5. **Simplicity:** Use existing libraries where possible (form builder, etc.)

---

This Claude.md is fully aligned with PRD v2.0 and ready for implementation.