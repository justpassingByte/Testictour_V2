import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@testictour.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@testictour.com',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      riotGameName: 'adminGame',
      riotGameTag: 'ADMIN',
      region: 'vn'
    }
  });
  console.log('✅ Created test admin user:', user.email, 'password: 123456');
}
main().catch(console.error).finally(() => prisma.$disconnect());