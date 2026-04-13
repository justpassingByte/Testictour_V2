const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const t = await prisma.tournament.findFirst({
    where: {
      status: 'pending'
    },
    include: { phases: true }
  });
  if (!t) return console.log('no tournament');
  console.log('Trying to delete', t.id);
  try {
    await prisma.tournament.delete({ where: { id: t.id } });
    console.log('Deleted successfully');
  } catch (e) {
    console.error('Delete error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
