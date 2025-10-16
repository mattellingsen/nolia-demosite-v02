# Prisma Schema Mismatch - Complete Fix Plan

## Problem
Production database schema doesn't match Prisma schema, causing `PrismaClientKnownRequestError` when creating/updating funds.

## Critical Files to Fix

### 1. ✅ ALREADY FIXED
- `/src/app/api/worldbank-base/create-async/route.ts` (Line 91) - **FIXED with raw SQL**

### 2. MUST FIX - Module Creation Endpoints

#### worldbank (projects) module
- `/src/app/api/worldbank-projects/create-async/route.ts` (Line 91-99)
  ```typescript
  const project = await prisma.fund.create({
    data: {
      name: name.trim(),
      description: description || null,
      status: 'DRAFT',
      moduleType: 'WORLDBANK',
      brainVersion: 1
    }
  });
  ```

#### procurement module
- `/src/app/api/procurement-base/create-async/route.ts` - Need to check this file
- `/src/app/api/tenders/create-async/route.ts` - Need to check this file

#### funding module
- `/src/app/api/funds/create-async/route.ts` (Line 47-53)
  ```typescript
  const fund = await prisma.fund.create({
    data: {
      name,
      description: description || 'Fund innovative businesses...',
      status: FundStatus.DRAFT,
    },
  });
  ```

### 3. UPDATE Operations (Lower Priority but Still Critical)

All these UPDATE operations might also fail if they try to update non-existent columns:
- `/src/app/api/jobs/process/route.ts` (Lines 687, 742, 793) - Fund updates with analysis
- `/src/app/api/worldbank-brain/[baseId]/assemble/route.ts` - Fund status updates
- `/src/app/api/worldbank-admin-brain/[baseId]/assemble/route.ts` - Fund status updates
- `/src/app/api/procurement-brain/[baseId]/assemble/route.ts` - Fund status updates
- `/src/app/api/brain/[fundId]/assemble/route.ts` - Fund status updates

## Solution Strategy

### Step 1: Fix ALL fund.create() operations
Replace Prisma ORM creates with raw SQL:
```typescript
const fundId = crypto.randomUUID();
await prisma.$executeRaw`
  INSERT INTO funds (id, name, description, status, "moduleType", "brainVersion", "createdAt", "updatedAt")
  VALUES (${fundId}, ${name}, ${description}, ${status}, ${moduleType}, 1, NOW(), NOW())
`;

const fund: any = await prisma.$queryRaw`
  SELECT * FROM funds WHERE id = ${fundId}
`.then(rows => rows[0]);
```

### Step 2: Fix ALL fund.update() operations
Replace Prisma ORM updates with raw SQL:
```typescript
await prisma.$executeRaw`
  UPDATE funds
  SET status = ${status}, "updatedAt" = NOW()
  WHERE id = ${fundId}
`;
```

### Step 3: Fix document.create() operations (if needed)
Check if fundDocument table has schema mismatches too.

## Files to Edit (IN ORDER)

1. `/src/app/api/worldbank-projects/create-async/route.ts`
2. `/src/app/api/procurement-base/create-async/route.ts`
3. `/src/app/api/tenders/create-async/route.ts`
4. `/src/app/api/funds/create-async/route.ts`
5. All brain assembly routes (update operations)
6. `/src/app/api/jobs/process/route.ts` (analysis updates)

## Testing Plan

After fixes:
1. Create worldbank-admin base - MUST WORK
2. Create worldbank project - MUST WORK
3. Create procurement base - MUST WORK
4. Create tender - MUST WORK
5. Create funding program - MUST WORK

## Notes

- Do NOT use Prisma ORM for fund.create() or fund.update()
- Always use raw SQL with proper column escaping ("moduleType", "createdAt", etc.)
- Keep using Prisma for SELECT operations (findFirst, findMany)
- Only fix CREATE and UPDATE operations
