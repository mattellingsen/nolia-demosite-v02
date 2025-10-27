import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAllBases() {
  // First, find all WORLDBANKGROUP_ADMIN bases
  const bases = await prisma.funds.findMany({
    where: {
      moduleType: 'WORLDBANKGROUP_ADMIN'
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      moduleType: true
    }
  });

  console.log('Current WORLDBANKGROUP_ADMIN bases:');
  bases.forEach(base => {
    console.log(`- ${base.name} (${base.status})`);
    console.log(`  ID: ${base.id}`);
    console.log(`  Description: ${base.description}`);
    console.log('');
  });

  // Update all to ACTIVE status
  const updated = await prisma.funds.updateMany({
    where: {
      moduleType: 'WORLDBANKGROUP_ADMIN',
      status: { not: 'ACTIVE' }
    },
    data: {
      status: 'ACTIVE'
    }
  });

  console.log(`\n✅ Updated ${updated.count} bases to ACTIVE status`);

  // Show final state
  const finalBases = await prisma.funds.findMany({
    where: {
      moduleType: 'WORLDBANKGROUP_ADMIN'
    },
    select: {
      id: true,
      name: true,
      status: true
    }
  });

  console.log('\nFinal status:');
  finalBases.forEach(base => {
    console.log(`- ${base.name}: ${base.status}`);
  });

  await prisma.$disconnect();
}

updateAllBases().catch(console.error);
