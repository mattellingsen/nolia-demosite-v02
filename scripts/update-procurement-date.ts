import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProcurementDate() {
  const baseId = '789befa3-1df7-4a40-a101-a36e3cdfaf0d';

  // Current values
  const current = await prisma.funds.findUnique({
    where: { id: baseId },
    select: { id: true, name: true, createdAt: true, updatedAt: true }
  });

  console.log('Current values:', current);

  // Update createdAt to today (Oct 25, 2025 at 00:00:00)
  const newDate = new Date('2025-10-25T00:00:00.000Z');

  const updated = await prisma.funds.update({
    where: { id: baseId },
    data: {
      createdAt: newDate,
      updatedAt: new Date() // Keep updatedAt as now
    }
  });

  console.log('Updated to:', {
    id: updated.id,
    name: updated.name,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt
  });

  console.log('\n✅ "Procurement Evaluation Report 2024" will now appear as the second card (newest after the "Set up" card)');

  await prisma.$disconnect();
}

updateProcurementDate().catch(console.error);
