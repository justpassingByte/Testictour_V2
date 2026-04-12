import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import ApiError from '../utils/ApiError';
import GrimoireService from './GrimoireService';
import { getRegionalRoutingValue, getPlatformIdentifier } from '../utils/RegionMapper';

const SALT_ROUNDS = 10;

// Helper to generate a random password
const generateRandomPassword = (length = 10) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default class UserService {
  static async register({ username, email, password, gameName, tagName, referrer, region }: { username: string; email: string; password: string; gameName?: string; tagName?: string; referrer?: string; region?: string }) {
    const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (exists) throw new ApiError(400, 'Username or email already exists');
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    let puuid: string | null = null;
    let platformRegion = '';

    if (gameName && tagName && region) {
      const regionalRouting = getRegionalRoutingValue(region);
      platformRegion = getPlatformIdentifier(region);
      try {
        puuid = await GrimoireService.fetchPuuid(gameName, tagName, region);
      } catch (error: any) {
        console.warn('Could not fetch PUUID for user', username, ':', error.message);
        // Continue registration without PUUID if fetching fails
      }
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        riotGameName: gameName || '',
        riotGameTag: tagName || '',
        region: platformRegion || 'VN2', // Store the platform identifier, default to VN2
        referrer: referrer || '',
        puuid: puuid,
        balance: {
          create: {
            amount: 0,
            coins: 1000
          }
        }
      },
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET as string, {
      expiresIn: '7d'
    });
    return { user, token };
  }

  static async login({ login, password }: { login: string; password: string }) {
    const isEmail = login.includes('@');
    
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: login } : { username: login },
    });

    if (!user) throw new ApiError(401, 'Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new ApiError(401, 'Invalid credentials');

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET as string, {
      expiresIn: '7d'
    });
    return { user: { id: user.id, username: user.username, email: user.email, role: user.role }, token };
  }

  static async importUsers(users: { username: string; tagName: string; balance: number; region?: string }[], referrer?: string) {
    const results = {
      successfulImports: [] as any[],
      failedImports: [] as any[],
    };

    for (const userData of users) {
      try {
        if (!userData.username) {
            throw new Error('Username is missing.');
        }

        // Use a transaction for each user import to ensure atomicity
        await prisma.$transaction(async (tx) => {
          const existingUser = await tx.user.findUnique({
            where: { username: userData.username },
            include: { balance: true }, // Include balance to update it
          });

          if (existingUser) {
            // If user exists, update their balance instead of throwing an error
            await tx.balance.update({
              where: { userId: existingUser.id },
              data: {
                amount: { increment: userData.balance },
              },
            });

            // Create a transaction record for the balance update
            await tx.transaction.create({
              data: {
                userId: existingUser.id,
                type: 'deposit',
                amount: userData.balance,
                status: 'success',
                refId: 'excel_import',
              },
            });

            results.successfulImports.push({ username: existingUser.username, email: existingUser.email, action: 'Balance Updated' });
          } else {
            // Create new user if not exists
            const password = "password123"; // Set a default password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const email = `${userData.username.toLowerCase().replace(/\s+/g, '_')}@imported.user`;

            let puuid: string | null = null;
            let platformRegion = getPlatformIdentifier(userData.region || 'sea'); // Default to SEA if not provided
            const regionalRouting = getRegionalRoutingValue(userData.region || 'sea');

            if (userData.username && userData.tagName && userData.region) {
              try {
                puuid = await GrimoireService.fetchPuuid(userData.username, userData.tagName, userData.region);
              } catch (error: any) {
                console.warn('Could not fetch PUUID for imported user', userData.username, ':', error.message);
                // Continue without PUUID if fetching fails
              }
            }

            const newUser = await tx.user.create({
              data: {
                username: userData.username,
                email: email,
                password: hashedPassword,
                riotGameName: userData.username,
                riotGameTag: String(userData.tagName) || 'VN',
                region: platformRegion, // Store the platform identifier
                referrer: referrer || null,
                puuid: puuid, // Store the fetched PUUID
                balance: {
                  create: {
                    amount: userData.balance || 0,
                  },
                },
              },
            });
            
            // Create a transaction record for the initial balance if it's not zero
            if (userData.balance > 0) {
              await tx.transaction.create({
                data: {
                  userId: newUser.id,
                  type: 'deposit',
                  amount: userData.balance,
                  status: 'success',
                  refId: 'excel_import',
                },
              });
            }
            results.successfulImports.push({ username: newUser.username, email: newUser.email, password });
          }
        }); // End of transaction

      } catch (error: any) {
        results.failedImports.push({ username: userData.username, reason: error.message });
      }
    }

    return results;
  }

  static async getUsersByReferrer(referrerUsername: string) {
    const users = await prisma.user.findMany({
      where: {
        referrer: referrerUsername,
      },
      select: {
        id: true,
        username: true,
        email: true,
        riotGameName: true,
        riotGameTag: true,
        region: true,
        role: true,
        totalMatchesPlayed: true,
        tournamentsWon: true,
        balance: {
          select: {
            amount: true,
          },
        },
      },
    });

    const usersWithWonAmount = await Promise.all(users.map(async (user) => {
      const totalAmountWonResult = await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          userId: user.id,
          type: { in: ['reward', 'payout'] }, // Assuming these types represent winnings
          status: 'success', // Only count successful transactions
        },
      });

      const totalAmountWon = totalAmountWonResult._sum.amount || 0;

      return {
        ...user,
        balance: user.balance?.amount || 0, // Flatten balance
        isActive: user.role !== 'banned', // Example: considering 'banned' as inactive
        totalAmountWon: totalAmountWon,
      };
    }));

    return usersWithWonAmount;
  }
} 