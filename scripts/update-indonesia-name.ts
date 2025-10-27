import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateIndonesiaName() {
  try {
    console.log('🔧 Updating Indonesia project name...\n');

    const projectId = '8641b9a0-1ff1-4ebc-90ba-7d9d4e663185';

    // Get current project
    const current = await prisma.funds.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true
      }
    });

    if (!current) {
      console.log('❌ Project not found');
      return;
    }

    console.log('📋 Current details:');
    console.log('   Name:', current.name);
    console.log('   Description:', current.description);
    console.log('');

    // Update name
    const updated = await prisma.funds.update({
      where: { id: projectId },
      data: {
        name: 'Cathlab Equipment',
        updatedAt: new Date()
      }
    });

    console.log('✅ Project name updated successfully!');
    console.log('   New name:', updated.name);
    console.log('');
    console.log('🔗 Changes will appear on:');
    console.log('   - /worldbankgroup/project-created?projectId=8641b9a0-1ff1-4ebc-90ba-7d9d4e663185');
    console.log('   - /worldbankgroup/setup (card title)');

  } catch (error) {
    console.error('❌ Error updating project name:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateIndonesiaName();
