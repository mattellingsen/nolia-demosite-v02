const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fullSystemCheck() {
  try {
    console.log('\n🔍 FULL SYSTEM CHECK - WORLDBANK_ADMIN MODULE');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Check for stuck PENDING/PROCESSING jobs
    const stuckJobs = await prisma.backgroundJob.findMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      include: {
        fund: { select: { id: true, name: true } }
      }
    });

    console.log('1️⃣  STUCK BACKGROUND JOBS (PENDING/PROCESSING):');
    if (stuckJobs.length === 0) {
      console.log('   ✅ None - Clean\n');
    } else {
      console.log('   ⚠️  Found ' + stuckJobs.length + ' stuck job(s):');
      stuckJobs.forEach(j => {
        console.log('      - Job ' + j.id + ': ' + j.type + ' (' + j.status + ') - Fund: ' + j.fund.name);
      });
      console.log('');
    }

    // 2. Check for DRAFT funds with documents but no jobs
    const orphanedFunds = await prisma.fund.findMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: 'DRAFT'
      },
      include: {
        documents: true,
        backgroundJobs: true
      }
    });

    const fundsWithDocsNoJobs = orphanedFunds.filter(f => 
      f.documents.length > 0 && f.backgroundJobs.length === 0
    );

    console.log('2️⃣  ORPHANED FUNDS (DRAFT with docs but no jobs):');
    if (fundsWithDocsNoJobs.length === 0) {
      console.log('   ✅ None - Clean\n');
    } else {
      console.log('   ⚠️  Found ' + fundsWithDocsNoJobs.length + ' orphaned fund(s):');
      fundsWithDocsNoJobs.forEach(f => {
        console.log('      - Fund ' + f.id + ': ' + f.name + ' (' + f.documents.length + ' docs, 0 jobs)');
      });
      console.log('');
    }

    // 3. Check for old FAILED jobs (might be retryable but clogging the queue)
    const failedJobs = await prisma.backgroundJob.findMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        fund: { select: { id: true, name: true } }
      }
    });

    console.log('3️⃣  RECENT FAILED JOBS (last 24h):');
    if (failedJobs.length === 0) {
      console.log('   ✅ None - Clean\n');
    } else {
      console.log('   ℹ️  Found ' + failedJobs.length + ' failed job(s):');
      failedJobs.forEach(j => {
        console.log('      - Job ' + j.id + ': ' + j.type + ' - ' + (j.errorMessage || 'No error message'));
      });
      console.log('');
    }

    // 4. Check for funds in DRAFT status for too long (> 1 hour)
    const oldDrafts = await prisma.fund.findMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: 'DRAFT',
        createdAt: {
          lte: new Date(Date.now() - 60 * 60 * 1000) // More than 1 hour old
        }
      },
      include: {
        documents: { select: { id: true } },
        backgroundJobs: { select: { id: true, status: true } }
      }
    });

    console.log('4️⃣  OLD DRAFT FUNDS (>1 hour, might be stuck):');
    if (oldDrafts.length === 0) {
      console.log('   ✅ None - Clean\n');
    } else {
      console.log('   ⚠️  Found ' + oldDrafts.length + ' old draft(s):');
      oldDrafts.forEach(f => {
        const age = Math.round((Date.now() - f.createdAt.getTime()) / (60 * 60 * 1000));
        console.log('      - Fund ' + f.id + ': ' + f.name + ' (' + age + 'h old, ' + 
          f.documents.length + ' docs, ' + f.backgroundJobs.length + ' jobs)');
      });
      console.log('');
    }

    // 5. Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log('  Stuck Jobs: ' + stuckJobs.length);
    console.log('  Orphaned Funds: ' + fundsWithDocsNoJobs.length);
    console.log('  Recent Failed Jobs: ' + failedJobs.length);
    console.log('  Old Drafts: ' + oldDrafts.length);
    
    const needsCleanup = stuckJobs.length > 0 || fundsWithDocsNoJobs.length > 0 || oldDrafts.length > 0;
    
    if (needsCleanup) {
      console.log('\n⚠️  SYSTEM NEEDS CLEANUP\n');
    } else {
      console.log('\n✅ SYSTEM IS COMPLETELY CLEAN AND READY FOR TESTING\n');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fullSystemCheck();
