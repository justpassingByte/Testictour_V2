import MatchService from '../src/services/MatchService';
import { prisma } from '../src/services/prisma';

const BASE_URL = 'http://localhost:4000/api'; // Điều chỉnh nếu backend của bạn chạy ở cổng khác

const USER_ID_FOR_TEST = 'YOUR_TEST_USER_ID'; // placeholder, will create dummy if not changed

const headers = {
  'Content-Type': 'application/json',
};

const riotMatchDataForTest = {
  "metadata": {
      "data_version": "6",
      "match_id": "VN2_930395393",
      "participants": [
          "DH7MwwQjP_IRTHXCK0TlDM0jADBBOa8h1Fb9KLGwlRXTfx9LttT0bHW5rGHpQwWREyX7_xVyobDPXQ",
          "L1GIB4J6UDyVW3eA3HtgxkN25G3Jx-ES-Kvz8-XWu1UF2U6QnKihPVE0t6LRfbGhleit0R9E1B2c9A",
          "gof2amxArpVkT3cdj5NagV1UhwWasvsxbBCdqI7Blsl7cSUCbrsWeflqWw2GjVeK5xZoqgu1TAv4wQ",
          "jOyHV7N0EJJh_WjXNQymtjW4d1RkLTkhrzjJmRtw0k_-zWaz0Y2GICbZl--Ezk08rLrkKEeTvxGbvw",
          "QwVqUQ4qNIZ-9FSF4sozqIs4ImKWPHo05nBxNj6QYh5vXIEVWd8SxMcZIrLLLOXPqVQjRXv8Tb_ekA",
          "hyoHk_vBGrk3U2bLJg9h4E4BXJ02BT3W0D3GvbAIdZsO5c41W4WxHk0mgtg3EI_0I49OjQNabCZRvA",
          "hi7m9Gb4WATkoxYUMCgwoIITRQl12TgWYi3_q5LOFML8KkIYmqr8b1EUXJcPTnxyIXwCGI2jLyDGDg",
          "rXEKrL8dSyGem4gwqjV5_90L9M_o63yBI7oR8TwJJyoZmPstu65jkpy4xTYRZynpn3igqF4ypwNBLg"
      ]
  },
  "info": {
      "endOfGameResult": "GameComplete",
      "gameCreation": 1750697572000, // Unix timestamp in milliseconds
      "gameId": 930395393,
      "game_datetime": 1750699528571,
      "game_length": 1919.3426513671875,
      "game_version": "Linux Version 15.12.688.6522 (Jun 10 2025/18:29:33) [PUBLIC] ",
      "mapId": 22,
      "participants": [], // Full data not needed for this test, as we only care about puuids from metadata
      "queueId": 1090,
      "queue_id": 1090,
      "tft_game_type": "standard",
      "tft_set_core_name": "TFTSet14",
      "tft_set_number": 14
  }
};

async function setupTestUsersAndLobby(): Promise<string | null> {
  console.log('\n--- Setting up Test Users and MiniTour Lobby in DB ---');
  const puuidToUserIdMap = new Map<string, string>(); // Map to store puuid -> userId
  let actualLobbyCreatorId: string; // This will hold the ID of the user who creates the lobby

  // Check if USER_ID_FOR_TEST is still the placeholder. If so, create a dummy user.
  if (USER_ID_FOR_TEST === 'YOUR_TEST_USER_ID') {
    try {
      let dummyUser = await prisma.user.findUnique({ where: { username: 'dummy_test_creator' } });
      if (!dummyUser) {
        dummyUser = await prisma.user.create({
          data: {
            username: 'dummy_test_creator',
            email: 'dummy_creator@example.com',
            password: 'dummy_password',
            puuid: `dummy_puuid_${Date.now()}`,
            riotGameName: 'Dummy',
            riotGameTag: 'CREATOR',
            region: 'sea',
          },
        });
        console.log('Created dummy creator user for testing.');
      } else {
        console.log('Dummy creator user already exists.');
      }
      actualLobbyCreatorId = dummyUser.id;
    } catch (error: any) {
      console.error('Error creating dummy creator user:', error.message);
      return null;
    }
  } else {
    actualLobbyCreatorId = USER_ID_FOR_TEST; // Use the provided ID if it's not the placeholder
    // Verify the provided user exists to prevent foreign key errors later
    const existingUser = await prisma.user.findUnique({ where: { id: actualLobbyCreatorId } });
    if (!existingUser) {
      console.error(`Provided USER_ID_FOR_TEST (${actualLobbyCreatorId}) does not exist in the database. Please provide a valid ID or leave as 'YOUR_TEST_USER_ID' to create a dummy user.`);
      return null;
    }
  }

  for (const puuid of riotMatchDataForTest.metadata.participants) {
    try {
      // Check if user with this puuid already exists
      let user = await prisma.user.findUnique({ where: { puuid } });

      if (!user) {
        // Create a new user if not found
        user = await prisma.user.create({
          data: {
            username: `testuser-${puuid.substring(0, 8)}`,
            email: `test-${puuid.substring(0, 8)}@example.com`,
            password: 'password123', // Dummy password
            puuid: puuid,
            riotGameName: `Player-${puuid.substring(0, 4)}`,
            riotGameTag: 'TEST',
            region: 'sea',
          },
        });
        console.log(`Created test user: ${user.username} with PUUID: ${puuid}`);
      } else {
        console.log(`User with PUUID ${puuid} already exists: ${user.username}.`);
      }
      puuidToUserIdMap.set(puuid, user.id); // Store the mapping
    } catch (error: any) {
      console.error(`Error upserting user ${puuid}:`, error.message);
      return null; // Stop if user setup fails
    }
  }

  if (puuidToUserIdMap.size < riotMatchDataForTest.metadata.participants.length) {
    console.error('Failed to setup all test users.');
    return null;
  }

  try {
    // Create MiniTourLobby with createdAt matching Riot gameCreation
    const lobbyCreationTime = new Date(riotMatchDataForTest.info.gameCreation); // Use Riot gameCreation as lobby creation time

    const miniTourLobby = await prisma.miniTourLobby.create({
      data: {
        name: `Automated Test Lobby - ${Date.now()}`,
        description: 'Lobby for testing Riot API match sync.',
        maxPlayers: riotMatchDataForTest.metadata.participants.length,
        entryFee: 0,
        entryType: 'free',
        prizePool: 0,
        gameMode: 'TFT',
        skillLevel: 'Any',
        theme: 'Automated',
        tags: ['automated-test'],
        rules: ['No specific rules for this test.'],
        prizeDistribution: { "1": 1.0 },
        settings: { autoStart: true, privateMode: true },
        status: "WAITING",
        currentPlayers: riotMatchDataForTest.metadata.participants.length,
        totalMatches: 0, // Will be incremented by startMiniTourLobby
        creator: { connect: { id: actualLobbyCreatorId } },
        createdAt: lobbyCreationTime, // Set specific creation time
        participants: {
          create: riotMatchDataForTest.metadata.participants.map(puuid => ({
            userId: puuidToUserIdMap.get(puuid)!, // Get the actual userId from the map
            // For simplicity, isHost can be false for all but one if needed, or default
          })),
        },
      },
      include: { participants: true }
    });

    console.log(`Created MiniTour Lobby in DB: ${miniTourLobby.id} with createdAt: ${miniTourLobby.createdAt}`);
    console.log(`Participants added to lobby: ${miniTourLobby.participants.length}`);

    return miniTourLobby.id;

  } catch (error: any) {
    console.error('Error creating MiniTour Lobby in DB:', error.message);
    return null;
  }
}

async function triggerSyncAndVerify(lobbyId: string) {
  console.log(`\n--- Manually triggering Match Sync for Lobby ${lobbyId} ---`);
  try {
    const lobby = await prisma.miniTourLobby.findUnique({
      where: { id: lobbyId },
      include: {
        participants: { include: { user: true } },
        creator: { select: { region: true } }
      }
    });

    if (!lobby) {
      console.error('Lobby not found for sync trigger.');
      return;
    }

    // Extract PUUIDs from participants (assuming user.puuid is the actual puuid)
    const targetParticipantsPuids = lobby.participants.map(p => p.user.puuid!);

    // --- Hardcode Riot Match ID to skip the search step ---
    // This is to specifically test the data comparison and sync process,
    // bypassing the match discovery logic.
    const riotMatchId = "VN2_930395393"; 
    console.log(`Skipping match search. Using hardcoded Riot Match ID: ${riotMatchId}`);

    if (riotMatchId) {
      console.log(`Found Riot Match ID ${riotMatchId}. Creating MiniTourMatch record and queueing sync.`);
      const newMiniTourMatch = await prisma.miniTourMatch.create({
        data: {
          miniTourLobbyId: lobbyId,
          matchIdRiotApi: riotMatchId,
          miniTourMatchResults: {
            create: lobby.participants.map(p => ({
              userId: p.userId,
              placement: 0,
              points: 0,
            })),
          },
        },
      });

      // Queue the match for Riot API data fetching
      await MatchService.queueMiniTourMatchSync(newMiniTourMatch.id, riotMatchId, lobbyId);
      console.log(`Queued MiniTourMatch sync for new match ${newMiniTourMatch.id} with Riot Match ID ${riotMatchId}.`);

    } else {
      console.warn('Could not find a matching Riot Match ID. Skipping match creation and sync queue.');
    }

    console.log('Waiting for worker to process match data (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for worker to process

    console.log('\n--- Verifying Match Data in Database ---');
    const updatedLobby = await prisma.miniTourLobby.findUnique({
      where: { id: lobbyId },
      include: {
        matches: { include: { miniTourMatchResults: true } }
      }
    });

    if (updatedLobby && updatedLobby.matches.length > 0) {
      const latestMatch = updatedLobby.matches[updatedLobby.matches.length - 1];
      console.log(`Found latest match in lobby: ${latestMatch.id}`);
      console.log(`Riot API Match ID: ${latestMatch.matchIdRiotApi}`);
      console.log(`Match Data available: ${!!latestMatch.matchData}`);

      if (latestMatch.matchIdRiotApi === riotMatchDataForTest.metadata.match_id && latestMatch.matchData) {
        console.log('SUCCESS: Riot Match ID and data correctly synced to DB!');
        // Further verification of matchResults if needed
        // console.log('Match Results:', latestMatch.miniTourMatchResults);
      } else {
        console.error('FAILURE: Riot Match ID or data not correctly synced.');
        if (latestMatch.matchIdRiotApi !== riotMatchDataForTest.metadata.match_id) {
          console.error(`Expected Riot Match ID: ${riotMatchDataForTest.metadata.match_id}, Actual: ${latestMatch.matchIdRiotApi}`);
        }
        if (!latestMatch.matchData) {
          console.error('Match data is null.');
        }
      }
    } else {
      console.error('FAILURE: No matches found for this lobby after triggering sync.');
    }

  } catch (error: any) {
    console.error('Error during sync trigger or verification:', error.response?.data || error.message);
  }
}

async function main() {
  // The USER_ID_FOR_TEST check is now handled within setupTestUsersAndLobby

  // Set up test users and the lobby directly in the database
  const lobbyIdForFullTest = await setupTestUsersAndLobby();
  if (lobbyIdForFullTest) {
    // Trigger the sync process and verify results
    await triggerSyncAndVerify(lobbyIdForFullTest);
  }
}

main(); 