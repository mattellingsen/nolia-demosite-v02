#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getLatest() {
  const base = await prisma.fund.findFirst({
    where: { moduleType: 'PROCUREMENT_ADMIN' },
    orderBy: { createdAt: 'desc' }
  });

  if (base) {
    console.log(base.id);
  }

  await prisma.$disconnect();
}

getLatest();
