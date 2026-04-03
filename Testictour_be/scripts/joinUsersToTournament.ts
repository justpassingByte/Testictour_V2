import { prisma } from '../src/services/prisma';
import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

async function main() {
  const tournamentId = process.argv[2];

  if (!tournamentId) {
    console.error('Usage: npx ts-node scripts/joinUsersToTournament.ts <tournamentId>');
    process.exit(1);
  }

  console.log(`Attempting to join users to tournament: ${tournamentId}`);

  const users = await prisma.user.findMany({
    where: {
      role: 'user', // Only target regular users
      email: { startsWith: 'user' }
    }
  });

  if (users.length === 0) {
    console.warn('No test users found in the database. Please run seed script first.');
    return;
  }

  for (const user of users) {
    try {
      // 1. Login user to get token
      const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: user.email,
        password: 'user123' // Assuming default seeded password
      });
      const token = loginRes.data.token;

      // 2. Join tournament
      await axios.post(
        `${BASE_URL}/api/tournaments/${tournamentId}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(`Successfully joined user ${user.username} (${user.email}) to tournament.`);
    } catch (error: any) {
      console.error(`Failed to join user ${user.username} (${user.email}) to tournament: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  console.log('Finished attempting to join all test users.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }); 