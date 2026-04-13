const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.platformSetting.deleteMany({ where: { key: { contains: 'platform_fee' } } }).then(console.log).finally(() => prisma.$disconnect());
