import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const usersToSeed = [
    {
        username: 'PlayerOne',
        email: 'player1@test.com',
        riotGameName: 'PlayerOne',
        riotGameTag: 'VN1',
        region: 'sea',
        puuid: 'QwVqUQ4qNIZ-9FSF4sozqIs4ImKWPHo05nBxNj6QYh5vXIEVWd8SxMcZIrLLLOXPqVQjRXv8Tb_ekA',
    },
    {
        username: 'PlayerTwo',
        email: 'player2@test.com',
        riotGameName: 'PlayerTwo',
        riotGameTag: 'sea',
        region: 'sea',
        puuid: 'Hqt8U6IcpRgGKyAFb8c0zJlqLzhV6h6YPBdxK13XCxxWdaJsyxL-NIOYq4RLwn6uFDVzk2FFG4gP7w',
    },
    {
        username: 'PlayerThree',
        email: 'player3@test.com',
        riotGameName: 'PlayerThree',
        riotGameTag: 'VN3',
        region: 'sea',
        puuid: 'jOyHV7N0EJJh_WjXNQymtjW4d1RkLTkhrzjJmRtw0k_-zWaz0Y2GICbZl--Ezk08rLrkKEeTvxGbvw',
    },
    {
        username: 'PlayerFour',
        email: 'player4@test.com',
        riotGameName: 'PlayerFour',
        riotGameTag: 'VN4',
        region: 'sea',
        puuid: 'zmH-XsttuPjFF9RmpmHE8YMBm4AEIhTfRIQpJzILqS-_KEh0z4994vYz213O5Mxl5iaKfJ5RQHK8ng',
    },
    {
        username: 'PlayerFive',
        email: 'player5@test.com',
        riotGameName: 'PlayerFive',
        riotGameTag: 'VN5',
        region: 'sea',
        puuid: 'DH7MwwQjP_IRTHXCK0TlDM0jADBBOa8h1Fb9KLGwlRXTfx9LttT0bHW5rGHpQwWREyX7_xVyobDPXQ',
    },
    {
        username: 'PlayerSix',
        email: 'player6@test.com',
        riotGameName: 'PlayerSix',
        riotGameTag: 'VN6',
        region: 'sea',
        puuid: '6mchQx9uxvVn61QRz_SfQ3J0MsH70DGbgC2SJDkP4Bqvj9rkHZBhkBvUG4qmsxhnK5hC5Dp2Vwp1Gg',
    },
    {
        username: 'PlayerSeven',
        email: 'player7n@test.com',
        riotGameName: 'PlayerSeven',
        riotGameTag: 'VN7',
        region: 'sea',
        puuid: 'KfMfqIUAnI3LS58jfVXA00VoE6p5ucdV31E6uhAY4IpQD816uFacJlOV-FHwOkg_kLkf69tEHBsqsw',
    },
    {
        username: 'PlayerEight',
        email: 'player8@test.com',
        riotGameName: 'PlayerEight',
        riotGameTag: 'VN8',
        region: 'sea',
        puuid: 'zB7IoE6YqiJykmU3chxWBwBxMQBy-faVQzRaOi4uzUPvU262mFwPDStMUkz8a68DUi3a34aknlW7Vg',
    },
];


async function main() {
  console.log(`Bắt đầu quá trình seeding...`);

  // --- 1. Tạo người dùng hệ thống (SYSTEM_USER) ---
  const systemUserId = 'SYSTEM_USER_ID';
  // Mật khẩu này chỉ dùng cho seeding, không ảnh hưởng đến bảo mật thực tế
  const systemPassword = await bcrypt.hash('a_very_secure_system_password_!@#$', 10); 

  // First check if a 'system_admin' username already exists with a different id
  const existingSystemByUsername = await prisma.user.findUnique({ where: { username: 'system_admin' } });
  let systemUser;
  if (existingSystemByUsername && existingSystemByUsername.id !== systemUserId) {
    // Username taken by a different ID – update its ID field is not possible, so reuse
    systemUser = existingSystemByUsername;
  } else {
    systemUser = await prisma.user.upsert({
      where: { id: systemUserId },
      update: {}, // Không cập nhật gì nếu đã tồn tại
      create: {
        id: systemUserId,
        username: 'system_admin',
        email: 'system@testic.tour',
        password: systemPassword,
        role: 'ADMIN',
        riotGameName: 'System',
        riotGameTag: 'SYS',
        region: 'SYS',
        puuid: `SYSTEM_PUUID_${systemUserId}` 
      },
    });
  }
  console.log(`Đã đảm bảo người dùng hệ thống tồn tại: ${systemUser.username}`);

  // --- 2. Tạo số dư cho người dùng hệ thống ---
  await prisma.balance.upsert({
      where: { userId: systemUser.id },
      update: {},
      create: {
          userId: systemUser.id,
          amount: 9999999, // Cho người dùng hệ thống nhiều tiền để nhận phí
      }
  });
  console.log(`Đã đảm bảo người dùng hệ thống có bản ghi số dư.`);

  console.log(`Bắt đầu tạo 8 người dùng mẫu...`);

  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  for (const userData of usersToSeed) {
    // Check both unique fields to prevent P2002 conflicts
    const existingByUsername = await prisma.user.findUnique({ where: { username: userData.username } });
    const existingByPuuid = userData.puuid ? await prisma.user.findUnique({ where: { puuid: userData.puuid } }) : null;

    let user;
    if (existingByUsername) {
      // User with this username exists – update with latest data
      user = await prisma.user.update({
        where: { username: userData.username },
        data: { ...userData, password: hashedPassword },
      });
    } else if (existingByPuuid) {
      // User with this puuid exists – update username & other fields
      user = await prisma.user.update({
        where: { puuid: userData.puuid },
        data: { ...userData, password: hashedPassword },
      });
    } else {
      // Brand new user
      user = await prisma.user.create({
        data: { ...userData, password: hashedPassword },
      });
    }
    console.log(`Đã tạo/cập nhật người dùng: ${user.username} (ID: ${user.id})`);
  }


  // Find all seeded users to create balances for them
  const seededUsers = await prisma.user.findMany({
    where: {
      puuid: {
        in: usersToSeed.map(u => u.puuid),
      },
    },
  });

  // Create balances for users who don't have one
  for (const user of seededUsers) {
    await prisma.balance.upsert({
      where: { userId: user.id },
      update: {}, // Do nothing if balance already exists
      create: {
        userId: user.id,
        amount: 1000,
      },
    });
    console.log(`Đã đảm bảo người dùng ${user.username} có số dư.`);
  }

  // --- Bổ sung: Tạo lobby và thêm 7 người dùng vào ---
  console.log(`\nBắt đầu tạo lobby và thêm 7 người chơi...`);

  const entryFee = 100; // Phí vào cửa của lobby

  // 1. Tạo một MiniTourLobby mới trực tiếp
  // Sử dụng systemUser đã tạo ở trên làm người tạo
  const lobby = await prisma.miniTourLobby.create({
    data: {
      name: 'Lobby Thử Nghiệm (7/8)',
      description: 'Giải đấu được tạo tự động để thử nghiệm.',
      entryFee: entryFee,
      maxPlayers: 8,
      creatorId: systemUser.id, // Sửa 'organizerId' thành 'creatorId'
      status: 'WAITING',
      rules: ['Luật chơi tiêu chuẩn.'],
      // Các trường khác có giá trị mặc định trong schema
    }
  });
  console.log(`Đã tạo Lobby: ${lobby.name} (ID: ${lobby.id})`);

  // 2. Lấy thông tin 7 người dùng (từ PlayerTwo đến PlayerEight)
  const usersToAddToLobby = await prisma.user.findMany({
    where: {
      username: {
        in: ['PlayerTwo', 'PlayerThree', 'PlayerFour', 'PlayerFive', 'PlayerSix', 'PlayerSeven', 'PlayerEight']
      }
    }
  });
  
  // 3. Thêm 7 người dùng vào lobby và cập nhật số dư, prize pool trong một giao dịch
  try {
    const finalPrizePool = usersToAddToLobby.length * entryFee;

    await prisma.$transaction(async (tx) => {
      for (const user of usersToAddToLobby) {
        // Thêm người chơi vào lobby
        await tx.miniTourLobbyParticipant.create({
          data: { 
            miniTourLobbyId: lobby.id, // Sửa 'lobbyId' thành 'miniTourLobbyId'
            userId: user.id 
          }
        });

        // Trừ phí vào cửa từ số dư
        await tx.balance.update({
          where: { userId: user.id },
          data: { amount: { decrement: entryFee } }
        });
      }

      // Cập nhật tổng giải thưởng cho lobby
      await tx.miniTourLobby.update({
        where: { id: lobby.id },
        data: {
          prizePool: finalPrizePool,
          currentPlayers: usersToAddToLobby.length,
          status: 'WAITING', // SỬA LẠI: Phải là WAITING để người khác có thể join
        }
      });
    });

    console.log(`Đã thêm thành công ${usersToAddToLobby.length} người dùng vào lobby.`);
  } catch (error) {
    console.error(`Giao dịch thêm người dùng vào lobby thất bại:`, error);
  }

  console.log(`Hoàn tất việc tạo người dùng và lobby.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 