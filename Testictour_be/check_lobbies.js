const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lobbies = await prisma.miniTourLobby.findMany({ select: { id: true, name: true, customLogoUrl: true } });
  console.log(JSON.stringify(lobbies, null, 2));
}
main().finally(() => prisma.$disconnect());
