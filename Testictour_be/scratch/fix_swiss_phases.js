const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fix any Swiss phases that have null lobbyAssignment
  const result = await prisma.phase.updateMany({
    where: { 
      type: 'swiss',
      lobbyAssignment: null
    },
    data: { 
      lobbyAssignment: 'swiss' 
    }
  });
  
  console.log(`Fixed ${result.count} Swiss phase(s) with null lobbyAssignment → 'swiss'`);

  // Verify
  const phases = await prisma.phase.findMany({
    where: { type: 'swiss' },
    select: { id: true, name: true, type: true, lobbyAssignment: true, status: true }
  });
  
  for (const p of phases) {
    console.log(`  Phase "${p.name}" | type=${p.type} | lobbyAssignment=${p.lobbyAssignment} | status=${p.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
