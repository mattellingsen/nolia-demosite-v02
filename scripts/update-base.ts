import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateBase() {
  const baseId = '789befa3-1df7-4a40-a101-a36e3cdfaf0d';

  // First, check current values
  const current = await prisma.funds.findUnique({
    where: { id: baseId },
    select: { id: true, name: true, description: true, moduleType: true }
  });

  console.log('Current values:', current);

  // Update (including createdAt to make it appear second in the list)
  const newDate = new Date('2025-10-25T00:00:00.000Z');

  const updated = await prisma.funds.update({
    where: { id: baseId },
    data: {
      name: 'Procurement Evaluation Report 2024',
      description: 'Procurement of Goods, Works, and Non-consulting Services.',
      createdAt: newDate,
      updatedAt: new Date()
    }
  });

  console.log('Updated to:', { id: updated.id, name: updated.name, description: updated.description });

  await prisma.$disconnect();
}

updateBase().catch(console.error);
