const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get the swiss phase
  const swissPhase = await prisma.phase.findFirst({
    where: { type: 'swiss', status: 'in_progress' },
    include: {
      rounds: {
        include: {
          lobbies: {
            include: {
              matches: {
                orderBy: { fetchedAt: 'asc' },
                include: {
                  matchResults: {
                    orderBy: { placement: 'asc' },
                    select: { userId: true, placement: true, points: true }
                  }
                }
              }
            },
            orderBy: { name: 'asc' }
          }
        }
      }
    }
  });

  if (!swissPhase) {
    console.log('No swiss phase in_progress found');
    return;
  }

  console.log(`\nSwiss Phase: "${swissPhase.name}" | type=${swissPhase.type} | lobbyAssignment=${swissPhase.lobbyAssignment} | matchesPerRound=${swissPhase.matchesPerRound}`);
  
  for (const round of swissPhase.rounds) {
    console.log(`\n=== Round ${round.roundNumber} (${round.id.substring(0,8)}) | status=${round.status} ===`);
    
    for (const lobby of round.lobbies) {
      console.log(`\n  Lobby "${lobby.name}" (${lobby.id.substring(0,8)}) | state=${lobby.state} | completedMatches=${lobby.completedMatchesCount} | fetchedResult=${lobby.fetchedResult}`);
      console.log(`  Current participants: [${(lobby.participants).map(id => id.substring(0,8)).join(', ')}]`);
      
      for (const match of lobby.matches) {
        const participantIds = match.matchResults.map(r => r.userId.substring(0,8));
        console.log(`    Match ${match.id.substring(0,8)}: players=[${participantIds.join(', ')}]`);
      }
    }
  }

  // Also check: what were the initial lobby participants (from the phase's first round before any reshuffle)?
  // Compare to current participants to see if reshuffle happened
  const allLobbiesInSwiss = await prisma.lobby.findMany({
    where: { round: { phaseId: swissPhase.id } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, participants: true, completedMatchesCount: true }
  });

  // Get first match and compare participants
  const firstMatches = await prisma.match.findMany({
    where: { lobby: { round: { phaseId: swissPhase.id } } },
    orderBy: { fetchedAt: 'asc' },
    include: { 
      matchResults: { select: { userId: true }, orderBy: { placement: 'asc' } },
      lobby: { select: { name: true, id: true, participants: true } }
    }
  });

  // Group by lobby to see Match 1 vs current participants
  const lobbyHistory = new Map();
  for (const m of firstMatches) {
    const lobbyId = m.lobbyId;
    if (!lobbyHistory.has(lobbyId)) lobbyHistory.set(lobbyId, []);
    lobbyHistory.get(lobbyId).push({
      matchId: m.id.substring(0,8),
      resultPlayers: m.matchResults.map(r => r.userId.substring(0,8)),
      currentLobbyParticipants: (m.lobby?.participants)?.map(id => id.substring(0,8))
    });
  }

  console.log('\n\n=== LOBBY HISTORY (Match results vs Current participants) ===');
  for (const [lobbyId, matches] of lobbyHistory) {
    const lobbyName = allLobbiesInSwiss.find(l => l.id === lobbyId)?.name || 'unknown';
    console.log(`\n  ${lobbyName} (${lobbyId.substring(0,8)}):`);
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      console.log(`    Match ${i+1}: played by [${m.resultPlayers.join(', ')}]`);
    }
    console.log(`    Current lobby: [${matches[0]?.currentLobbyParticipants?.join(', ') || 'N/A'}]`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
