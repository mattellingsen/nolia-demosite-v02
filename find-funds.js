// Quick script to find available funds
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findFunds() {
  try {
    const funds = await prisma.fund.findMany({
      select: {
        id: true,
        name: true,
        brainAssembledAt: true,
        outputTemplatesAnalysis: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('Available funds:');
    funds.forEach(f => {
      console.log(`- ${f.name}: ${f.id}`);
      console.log(`  Brain assembled: ${f.brainAssembledAt ? 'Yes' : 'No'}`);
      console.log(`  Output template: ${f.outputTemplatesAnalysis ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Find Student Experience Grant specifically
    const studentGrant = funds.find(f => f.name.includes('Student Experience Grant'));
    if (studentGrant) {
      console.log(`🎯 Student Experience Grant found: ${studentGrant.id}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findFunds();