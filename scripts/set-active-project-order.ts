import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setActiveProjectOrder() {
  try {
    console.log('🔧 Setting ACTIVE project display order...\n');

    // Define the desired order with specific dates (ASC order)
    // Earlier dates = appear first in the ACTIVE section
    const projectOrder = [
      { name: 'Indonesia Health Systems Strengthening Project', date: '2025-10-20T00:00:00.000Z' },
      { name: 'OPRC', date: '2025-10-21T00:00:00.000Z' },
      { name: 'MRI', date: '2025-10-22T00:00:00.000Z' },
      { name: 'Molecular eMRD', date: '2025-10-23T00:00:00.000Z' },
      { name: 'Minor Surgery Equipment', date: '2025-10-24T00:00:00.000Z' },
      { name: 'Infant Warmers', date: '2025-10-25T00:00:00.000Z' }
    ];

    for (const { name, date } of projectOrder) {
      // Find project by name
      const project = await prisma.funds.findFirst({
        where: {
          name: {
            contains: name,
            mode: 'insensitive'
          },
          moduleType: 'WORLDBANKGROUP'
        }
      });

      if (!project) {
        console.log(`⚠️  Project not found: ${name}`);
        continue;
      }

      // Update createdAt date
      await prisma.funds.update({
        where: { id: project.id },
        data: {
          createdAt: new Date(date),
          updatedAt: new Date()
        }
      });

      console.log(`✅ ${name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Date: ${date}\n`);
    }

    console.log('🎉 All ACTIVE projects ordered successfully!');
    console.log('');
    console.log('💡 Card ordering now:');
    console.log('   1st: "Setup new project" (hardcoded)');
    console.log('   2nd+: PROCESSING projects (newest first)');
    console.log('   Then: ACTIVE projects in specified order');
    console.log('');
    console.log('🔗 Verify at: http://localhost:3000/worldbankgroup/setup');

  } catch (error) {
    console.error('❌ Error setting project order:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setActiveProjectOrder();
