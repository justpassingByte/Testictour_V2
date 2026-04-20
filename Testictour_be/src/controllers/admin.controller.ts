import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import bcrypt from 'bcrypt';
import * as xlsx from 'xlsx';
import UserService from '../services/UserService';

const prisma = new PrismaClient();

export const importUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new ApiError(400, 'Please upload a file.'));
  }

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  const referrer = req.body.referrer as string | undefined; // Get referrer from request body

  if (!Array.isArray(data) || data.length === 0) {
    return next(new ApiError(400, 'The Excel file is empty or in the wrong format.'));
  }

  // Assuming columns are: 'username', 'tagName', 'balance', 'region'
  const usersToImport = data.map((row: any) => {
    const username = String(row.username || row['tên ingame'] || '').trim();
    let tagName = String(row.tagName || row['tagname'] || '').trim(); // Make tagName mutable
    // Remove leading # from tagName if present
    if (tagName.startsWith('#')) {
      tagName = tagName.substring(1);
    }
    const balance = parseFloat(row.balance || row['coin'] || 0) * 1000;
    const region = String(row.region || row['region'] || 'asia').trim(); // Default to 'VN' if not provided

    if (!username) {
      return { username: null, reason: 'Username is missing or empty.' };
    }

    return {
      username,
      tagName,
      balance,
      region, // Include region
    };
  });

  // Filter out rows that failed initial validation for missing username
  const validUsersToImport = usersToImport.filter(user => user.username !== null);
  const initialFailedImports = usersToImport.filter(user => user.username === null).map(user => ({ username: user.username || 'N/A', reason: user.reason }));

  // Pass referrer to UserService.importUsers
  const result = await UserService.importUsers(validUsersToImport, referrer);

  // Combine results
  result.failedImports = [...initialFailedImports, ...result.failedImports];

  res.status(201).json({
    message: 'Users imported successfully.',
    result,
  });
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const role = req.query.role as string;
  const skip = (page - 1) * limit;

  const whereCondition: { role?: string } = {};
  if (role && role !== 'all') {
    whereCondition.role = role;
  }

  const [users, totalUsers] = await prisma.$transaction([
    prisma.user.findMany({
      where: whereCondition,
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        balance: {
          select: {
            amount: true,
          },
        },
        partnerSubscription: {
          select: {
            plan: true,
          },
        },
      },
    }),
    prisma.user.count({ where: whereCondition }),
  ]);

  // Transform balance from nested object to flat number, and extract subscriptionPlan
  const transformedUsers = users.map(user => ({
    ...user,
    balance: user.balance?.amount || 0,
    subscriptionPlan: user.partnerSubscription?.plan || null,
    partnerSubscription: undefined,
  }));

  const totalPages = Math.ceil(totalUsers / limit);

  res.status(200).json({
    data: transformedUsers,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalUsers,
      limit,
    },
  });
});

export const getUserDetail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      balance: {
        select: {
          amount: true,
          updatedAt: true,
        }

      },
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
      playerMatchSummaries: true,
      userTournamentSummaries: true,
    },
  });

  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  // Transform balance for consistency and remove password
  const userDetail = {
    ...user,
    password: undefined, // Remove password for security
    balance: user.balance?.amount || 0, // Flatten balance
  };

  res.status(200).json(userDetail);
});

export const createUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password, role } = req.body; // Added role

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return next(new ApiError(400, 'User with this email already exists'));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: role || 'user', // Use provided role or default to 'user'
      riotGameName: username, // Default for now, can be updated later
      riotGameTag: 'NA1', // Default
      region: 'NA',
      balance: { create: { amount: 0 } }, // Initialize balance for new user
    },
    select: { id: true, username: true, email: true, role: true },
  });

  res.status(201).json({ message: 'User created successfully', user: newUser });
});

export const updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { username, email, role, riotGameName, riotGameTag, region } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      username: username || user.username,
      email: email || user.email,
      role: role || user.role,
      riotGameName: riotGameName || user.riotGameName,
      riotGameTag: riotGameTag || user.riotGameTag,
      region: region || user.region,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      riotGameName: true,
      riotGameTag: true,
      region: true,
      balance: {
        select: { amount: true, updatedAt: true },
      },
      createdAt: true,
      rank: true,
      rankUpdatedAt: true,
      totalMatchesPlayed: true,
      averagePlacement: true,
      topFourRate: true,
      firstPlaceRate: true,
      tournamentsPlayed: true,
      tournamentsWon: true,
      lastUpdatedStats: true,
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
      playerMatchSummaries: true,
      userTournamentSummaries: true,
    },
  });

  // Transform balance for consistency and remove password if it was included
  const userDetail = {
    ...updatedUser,
    password: undefined, // Ensure password is not returned
    balance: updatedUser.balance?.amount || 0, // Flatten balance
  };

  res.status(200).json(userDetail);
});

export const banUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  // Implement actual ban logic (e.g., set a 'banned' flag, change role, etc.)
  // For now, let's just update the role to a 'banned' state or add a flag
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role: 'banned' }, // Or set a 'isBanned: true' field if it exists
    select: { id: true, username: true, email: true, role: true },
  });

  res.status(200).json({ message: `User ${user.username} has been banned`, user: updatedUser });
});
export const deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  // Soft delete or hard delete? Depending on schema, let's just delete
  await prisma.user.delete({ where: { id } });

  res.status(200).json({ message: `User ${user.username} has been deleted successfully` });
});
export const updateTransactionStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) return next(new ApiError(404, 'Transaction not found'));

  let updatedTransaction;
  // If it's an entry fee and they want to mark as success/paid, route it through ParticipantPaymentService to update the Participant
  if (transaction.type === 'entry_fee' && (status === 'success' || status === 'paid') && transaction.status === 'pending') {
    const ParticipantPaymentService = (await import('../services/ParticipantPaymentService')).default;
    const providerEventId = `manual_admin_confirm_${transaction.id}_${Date.now()}`;
    await ParticipantPaymentService.confirmEntryFeePayment(transaction.id, providerEventId);
    
    if (note) {
      updatedTransaction = await prisma.transaction.update({
        where: { id },
        data: { reviewNotes: note }
      });
    } else {
      updatedTransaction = await prisma.transaction.findUnique({ where: { id }});
    }
  } else {
    // Normal update
    updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        status,
        ...(note !== undefined && { reviewNotes: note })
      }
    });

    // If marking entry_fee as failed/cancelled, we should delete the participant so they don't hold the slot
    if (transaction.type === 'entry_fee' && (status === 'failed' || status === 'cancelled') && transaction.status === 'pending') {
      const participant = await prisma.participant.findFirst({ where: { id: transaction.refId || '' } });
      if (participant && !participant.paid) {
        await prisma.$transaction([
          prisma.participant.delete({ where: { id: participant.id } }),
          ...(!participant.isReserve ? [prisma.tournament.update({
            where: { id: transaction.tournamentId! },
            data: { actualParticipantsCount: { decrement: 1 } }
          })] : [])
        ]);
      }
    }
  }

  res.status(200).json({ message: 'Transaction status updated successfully', transaction: updatedTransaction });
});

export const depositToUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { amount } = req.body;

  const depositAmount = Number(amount);

  if (!amount || isNaN(depositAmount) || depositAmount <= 0) {
    return next(new ApiError(400, 'Số tiền nạp không hợp lệ'));
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return next(new ApiError(404, 'Không tìm thấy người dùng'));
  }

  // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
  const updatedUserWithDetails = await prisma.$transaction(async (tx) => {
    // 1. Cập nhật số dư
    await tx.balance.update({
      where: { userId: id },
      data: {
        amount: {
          increment: depositAmount,
        },
      },
    });

    // 2. Tạo bản ghi giao dịch
    await tx.transaction.create({
      data: {
        userId: id,
        type: 'deposit',
        amount: depositAmount,
        status: 'success',
      },
    });

    // 3. Lấy lại thông tin chi tiết người dùng đã cập nhật để trả về
    const updatedUser = await tx.user.findUnique({
      where: { id },
      include: {
        balance: { select: { amount: true, updatedAt: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
        playerMatchSummaries: true,
        userTournamentSummaries: true,
      },
    });

    if (!updatedUser) {
      throw new Error('Không thể lấy thông tin người dùng sau khi nạp tiền.');
    }

    // Biến đổi dữ liệu để nhất quán với getUserDetail
    return {
      ...updatedUser,
      password: undefined,
      balance: updatedUser.balance?.amount || 0,
    };
  });

  res.status(200).json(updatedUserWithDetails);
});

export const getUsersByReferrer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const referrer = req.query.referrer as string;

  if (!referrer) {
    return next(new ApiError(400, 'Referrer username is required.'));
  }

  const users = await UserService.getUsersByReferrer(referrer);

  res.status(200).json({ data: users });
});

// ─── Admin Stats ────────────────────────────────────────────
export const getAdminStats = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all queries in parallel
  const [
    totalUsers,
    totalPartners,
    totalPlayers,
    totalLobbies,
    totalTournaments,
    activeTournaments,
    totalMatches,
    subscriptions,
    waitingLobbies,
    inProgressLobbies,
    completedLobbies,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'partner' } }),
    prisma.user.count({ where: { role: 'user' } }),
    prisma.miniTourLobby.count(),
    prisma.tournament.count(),
    prisma.tournament.count({ where: { status: 'in_progress' } }),
    prisma.miniTourMatch.count(),
    prisma.partnerSubscription.findMany({
      where: { status: 'ACTIVE' },
      select: { plan: true, monthlyPrice: true, createdAt: true },
    }),
    prisma.miniTourLobby.count({ where: { status: 'WAITING' } }),
    prisma.miniTourLobby.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.miniTourLobby.count({ where: { status: 'COMPLETED' } }),
  ]);

  // Calculate revenue from active subscriptions
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
  const monthlyRevenue = subscriptions
    .filter(s => s.createdAt >= startOfMonth)
    .reduce((sum, s) => sum + (s.monthlyPrice || 0), 0) || totalRevenue;

  // Count subscription plans
  const subscriptionPlans = { STARTER: 0, PRO: 0, ENTERPRISE: 0 };
  subscriptions.forEach(s => {
    if (s.plan === 'STARTER') subscriptionPlans.STARTER++;
    else if (s.plan === 'PRO') subscriptionPlans.PRO++;
    else if (s.plan === 'ENTERPRISE') subscriptionPlans.ENTERPRISE++;
    else subscriptionPlans.STARTER++; // Fallback
  });

  // Also count partners without subscriptions as STARTER
  const partnersWithSubs = subscriptions.length;
  subscriptionPlans.STARTER += Math.max(0, totalPartners - partnersWithSubs);

  res.status(200).json({
    data: {
      totalUsers,
      totalPartners,
      totalPlayers,
      totalLobbies,
      totalTournaments,
      activeTournaments,
      totalMatches,
      totalRevenue,
      monthlyRevenue,
      subscriptionPlans,
      lobbyStatuses: {
        WAITING: waitingLobbies,
        IN_PROGRESS: inProgressLobbies,
        COMPLETED: completedLobbies,
      },
    },
  });
});

// ─── Subscription CRUD ──────────────────────────────────────
export const getSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const subscriptions = await prisma.partnerSubscription.findMany({
    include: {
      user: {
        select: { id: true, username: true, email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const planConfigs = await prisma.subscriptionPlanConfig.findMany();
  const planMap = Object.fromEntries(planConfigs.map((p) => [p.plan, p]));

  // Transform to match frontend's expected shape and add limits mapping
  const data = await Promise.all(subscriptions.map(async (s) => {
    const limits = planMap[s.plan as string] || { maxLobbies: 0, maxTournamentsPerMonth: 0, maxTournamentSize: 0 };

    const activeLobbies = await prisma.miniTourLobby.count({
      where: {
        creatorId: s.userId,
        status: { in: ['WAITING', 'READY_CHECK', 'GRACE_PERIOD', 'STARTING', 'IN_PROGRESS'] }
      }
    });

    const tournamentsThisMonth = await prisma.tournament.count({
      where: {
        organizerId: s.userId,
        createdAt: { gte: startOfMonth }
      }
    });

    return {
      ...s,
      limits: {
        maxLobbies: limits.maxLobbies,
        maxTournamentsPerMonth: limits.maxTournamentsPerMonth,
        maxTournamentSize: limits.maxTournamentSize,
        usage: {
          activeLobbies,
          tournamentsThisMonth
        }
      },
      partnerId: s.userId,
      partner: s.user,
      user: undefined,
    };
  }));

  res.status(200).json({ data });
});

export const updateSubscription = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { partnerId } = req.params;
  const { plan, status, features, monthlyPrice, annualPrice, autoRenew } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingSub = await tx.partnerSubscription.findUnique({ where: { userId: partnerId } });

      const isNewPlan = existingSub?.plan !== plan;
      const priceToCharge = Number(monthlyPrice || 0);

      // Charge balance and log revenue if they are switching to a new paid plan
      if (isNewPlan && priceToCharge > 0) {
        const userBalance = await tx.balance.findUnique({ where: { userId: partnerId } });

        if (!userBalance || userBalance.amount < priceToCharge) {
          throw new Error("Insufficient balance to upgrade subscription");
        }

        // Deduct from balance
        await tx.balance.update({
          where: { userId: partnerId },
          data: { amount: { decrement: priceToCharge } }
        });

        // Log transaction
        await tx.transaction.create({
          data: {
            userId: partnerId,
            type: 'subscription_payment',
            amount: priceToCharge,
            status: 'success',
            refId: `admin_sub_upgrade_${plan}_${Date.now()}`
          }
        });
      }

      // Upsert — create if not exists, update if exists
      const subscription = await tx.partnerSubscription.upsert({
        where: { userId: partnerId },
        update: {
          plan: plan !== undefined ? plan : undefined,
          status: status !== undefined ? status : undefined,
          features: features !== undefined ? features : undefined,
          monthlyPrice: monthlyPrice !== undefined ? monthlyPrice : undefined,
          annualPrice: annualPrice !== undefined ? annualPrice : undefined,
          autoRenew: autoRenew !== undefined ? autoRenew : undefined,
        },
        create: {
          userId: partnerId,
          plan: plan || 'STARTER',
          status: status || 'ACTIVE',
          features: features || {},
          monthlyPrice: monthlyPrice || null,
          annualPrice: annualPrice || null,
          autoRenew: autoRenew ?? true,
        },
        include: {
          user: {
            select: { id: true, username: true, email: true, createdAt: true },
          },
        },
      });

      return subscription;
    });

    res.status(200).json({
      data: { ...result, partnerId: result.userId, partner: result.user },
    });
  } catch (error: any) {
    if (error.message === "Insufficient balance to upgrade subscription") {
      return next(new ApiError(400, error.message));
    }
    throw error;
  }
});

export const deleteSubscription = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { partnerId } = req.params;

  const existing = await prisma.partnerSubscription.findUnique({ where: { userId: partnerId } });
  if (!existing) {
    return next(new ApiError(404, 'Subscription not found'));
  }

  await prisma.partnerSubscription.delete({ where: { userId: partnerId } });

  res.status(200).json({ message: 'Subscription deleted successfully' });
});

// ─── Admin Analytics ────────────────────────────────────────
export const getAdminAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();

  // Last 6 months labels
  const months: string[] = [];
  const monthStarts: Date[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString('en', { month: 'short', year: '2-digit' }));
    monthStarts.push(d);
  }

  // Partner growth per month (users with role=partner created in each month)
  const partnerGrowth = await Promise.all(
    monthStarts.map(async (start, idx) => {
      const end = idx < monthStarts.length - 1
        ? monthStarts[idx + 1]
        : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const count = await prisma.user.count({
        where: { role: 'partner', createdAt: { gte: start, lt: end } },
      });
      return count;
    })
  );

  // Lobby creation per month
  const lobbyGrowth = await Promise.all(
    monthStarts.map(async (start, idx) => {
      const end = idx < monthStarts.length - 1
        ? monthStarts[idx + 1]
        : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const count = await prisma.miniTourLobby.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      return count;
    })
  );

  // Match activity per month
  const matchActivity = await Promise.all(
    monthStarts.map(async (start, idx) => {
      const end = idx < monthStarts.length - 1
        ? monthStarts[idx + 1]
        : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const count = await prisma.miniTourMatch.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      return count;
    })
  );

  // Top partners by lobby count
  const topPartners = await prisma.user.findMany({
    where: { role: 'partner' },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      createdMiniTourLobbies: { select: { id: true, status: true } },
      partnerSubscription: { select: { plan: true, status: true, monthlyPrice: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const topPartnersData = topPartners
    .map(p => ({
      id: p.id,
      username: p.username,
      email: p.email,
      joinedAt: p.createdAt,
      totalLobbies: p.createdMiniTourLobbies.length,
      activeLobbies: p.createdMiniTourLobbies.filter(l => l.status === 'IN_PROGRESS').length,
      plan: p.partnerSubscription?.plan || 'STARTER',
      subscriptionStatus: p.partnerSubscription?.status || 'NONE',
      revenue: p.partnerSubscription?.monthlyPrice || 0,
    }))
    .sort((a, b) => b.totalLobbies - a.totalLobbies)
    .slice(0, 10);

  // Subscription distribution
  const allSubs = await prisma.partnerSubscription.findMany({
    select: { plan: true, status: true, monthlyPrice: true },
  });

  const subscriptionBreakdown = {
    STARTER: { count: 0, revenue: 0 },
    PRO: { count: 0, revenue: 0 },
    ENTERPRISE: { count: 0, revenue: 0 },
  };

  allSubs.forEach(s => {
    let key = s.plan as keyof typeof subscriptionBreakdown;
    // Map legacy 'FREE' or anything else to STARTER
    if (key !== 'PRO' && key !== 'ENTERPRISE') key = 'STARTER';
    if (subscriptionBreakdown[key]) {
      subscriptionBreakdown[key].count++;
      if (s.status === 'ACTIVE') {
        subscriptionBreakdown[key].revenue += s.monthlyPrice || 0;
      }
    }
  });

  // Count partners without subscriptions as STARTER
  const totalPartners = await prisma.user.count({ where: { role: 'partner' } });
  subscriptionBreakdown.STARTER.count += Math.max(0, totalPartners - allSubs.length);

  res.status(200).json({
    data: {
      months,
      partnerGrowth,
      lobbyGrowth,
      matchActivity,
      topPartners: topPartnersData,
      subscriptionBreakdown,
    },
  });
});

// ─── Partner Detail For Admin ────────────────────────────────

export const getPartnerDetailForAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id: partnerId } = req.params;

  // 1. Get the partner user and subscription
  const partner = await prisma.user.findUnique({
    where: { id: partnerId, role: 'partner' },
    include: {
      balance: true,
      partnerSubscription: true,
      transactions: { orderBy: { createdAt: 'desc' } },
    }
  });

  if (!partner) {
    return next(new ApiError(404, 'Partner not found'));
  }

  // 2. Map Base Partner User Details
  const partnerDetail = {
    ...partner,
    password: undefined,
    balance: partner.balance?.amount || 0,
    subscriptionPlan: partner.partnerSubscription?.plan || null,
  };

  // 3. Get all lobbies created by this partner
  const lobbies = await prisma.miniTourLobby.findMany({
    where: { creatorId: partnerId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, username: true, email: true, riotGameName: true, riotGameTag: true }
          }
        }
      },
      matches: {
        include: {
          miniTourMatchResults: {
            include: { user: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate detailed stats
  const totalLobbies = lobbies.length;
  const activeLobbies = lobbies.filter(l => l.status === 'IN_PROGRESS').length;
  let totalMatches = 0;

  const lobbyStatuses = { WAITING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  lobbies.forEach(l => {
    if (l.status === 'WAITING') lobbyStatuses.WAITING++;
    else if (l.status === 'IN_PROGRESS') lobbyStatuses.IN_PROGRESS++;
    else if (l.status === 'COMPLETED') lobbyStatuses.COMPLETED++;
    totalMatches += l.matches.length;
  });

  // Unique players who joined this partner's lobbies
  const uniquePlayerIds = new Set<string>();
  let lastPlayedMap = new Map<string, Date>();

  lobbies.forEach(lobby => {
    lobby.participants.forEach(p => {
      if (p.user) {
        uniquePlayerIds.add(p.user.id);
        const currentLastPlayed = lastPlayedMap.get(p.user.id);
        if (!currentLastPlayed || new Date(lobby.createdAt) > currentLastPlayed) {
          lastPlayedMap.set(p.user.id, new Date(lobby.createdAt));
        }
      }
    });
  });

  // Fetch players with their profile cached stats directly
  const cachedUsers = await prisma.user.findMany({
    where: { id: { in: Array.from(uniquePlayerIds) } },
    select: {
      id: true,
      username: true,
      email: true,
      riotGameName: true,
      riotGameTag: true,
      lobbiesPlayed: true,
      totalPoints: true,
    }
  });

  const players = cachedUsers.map(u => ({
    ...u,
    lastPlayed: lastPlayedMap.get(u.id) || new Date(0)
  }));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate revenue from lobbies (same logic as partner.controller.ts getSummary)
  let totalRevenue = 0;
  let monthlyRevenue = 0;

  lobbies.forEach(lobby => {
    const legacyShare = lobby.partnerRevenueShare || 0.10;
    const lobbyRevenue = lobby.entryFee * lobby.currentPlayers * legacyShare;
    totalRevenue += lobbyRevenue;
    if (new Date(lobby.createdAt) >= startOfMonth) {
      monthlyRevenue += lobbyRevenue;
    }
  });

  totalRevenue = Math.round(totalRevenue * 100) / 100;
  monthlyRevenue = Math.round(monthlyRevenue * 100) / 100;

  let enrichedSubscription: any = partner.partnerSubscription;
  if (partner.partnerSubscription) {
    const planConfig = await prisma.subscriptionPlanConfig.findUnique({
      where: { plan: partner.partnerSubscription.plan }
    });
    
    // Tournaments this month
    const tournamentsThisMonth = await prisma.tournament.count({
      where: {
        organizerId: partnerId,
        createdAt: { gte: startOfMonth }
      }
    });

    enrichedSubscription = {
      ...partner.partnerSubscription,
      limits: {
        maxLobbies: planConfig?.maxLobbies || 0,
        maxTournamentsPerMonth: planConfig?.maxTournamentsPerMonth || 0,
        maxTournamentSize: planConfig?.maxTournamentSize || 0,
        usage: {
          activeLobbies, // already tracked in stats calculation above
          tournamentsThisMonth
        }
      }
    };
  }

  // Fetch all tournaments (Needs to be outside the if scope)
  const tournaments = await prisma.tournament.findMany({
    where: { organizerId: partnerId },
    include: {
      _count: {
        select: { participants: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const WalletLedgerService = (await import('../services/WalletLedgerService')).default;
  const ledger = await WalletLedgerService.getPartnerLedger(partnerId);

  // Return the combined object AdminPartnerDetail
  res.status(200).json({
    partner: partnerDetail,
    stats: {
      totalPlayers: players.length,
      totalRevenue: ledger.totals.netPartnerBalance || totalRevenue, // Prioritize the ledger net balance
      monthlyRevenue,
      activeLobbies,
      totalLobbies,
      totalMatches,
      balance: partnerDetail.balance,
      lobbyStatuses
    },
    transactions: partner.transactions,
    lobbies,
    tournaments,
    ledger, // Send the wallet ledger
    players,
    subscription: enrichedSubscription
  });
});
