import { PrismaClient } from '@prisma/client';
import StripeService from '../services/StripeService';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();

export default {
    // GET /partner/summary
    async getSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;

            // Get partner's lobbies
            const lobbies = await prisma.miniTourLobby.findMany({
                where: { creatorId: userId },
                include: {
                    participants: true,
                    matches: {
                        include: { miniTourMatchResults: true },
                    },
                },
            });

            // Get partner's balance
            const balance = await prisma.balance.findUnique({
                where: { userId },
            });

            // Get referred players count
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const referredPlayers = await prisma.user.count({
                where: { referrer: user?.username || '' },
            });

            // Calculate metrics
            const totalLobbies = lobbies.length;
            const activeLobbies = lobbies.filter(l => l.status === 'WAITING' || l.status === 'IN_PROGRESS').length;
            const completedLobbies = lobbies.filter(l => l.status === 'COMPLETED').length;

            const totalMatches = lobbies.reduce((sum, l) => sum + l.matches.length, 0);
            const totalPlayers = new Set(
                lobbies.flatMap(l => l.participants.map(p => p.userId))
            ).size;

            // Calculate revenue (sum of creator fees from entry fees)
            const totalRevenue = lobbies.reduce((sum, lobby) => {
                const legacyShare = lobby.partnerRevenueShare || 0.10;
                return sum + (lobby.entryFee * lobby.currentPlayers * legacyShare);
            }, 0);

            // Monthly revenue (lobbies created this month)
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthlyRevenue = lobbies
                .filter(l => new Date(l.createdAt) >= monthStart)
                .reduce((sum, lobby) => {
                    const legacyShare = lobby.partnerRevenueShare || 0.10;
                    return sum + (lobby.entryFee * lobby.currentPlayers * legacyShare);
                }, 0);

            // Lobby status breakdown
            const lobbyStatuses = {
                WAITING: lobbies.filter(l => l.status === 'WAITING').length,
                IN_PROGRESS: lobbies.filter(l => l.status === 'IN_PROGRESS').length,
                COMPLETED: completedLobbies,
            };

            // Get Partner Subscription for Default Host Fee Config
            const sub = await prisma.partnerSubscription.findUnique({
                where: { userId }
            });
            const features = sub?.features as any || {};
            const currentHostFeePercent = typeof features?.hostFeePercent === 'number' ? Math.round(features.hostFeePercent * 100) : 10;

            const summary = {
                id: userId,
                username: user?.username || '',
                email: user?.email || '',
                totalPlayers: Math.max(referredPlayers, totalPlayers),
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                activeLobbies,
                totalLobbies,
                monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
                balance: balance?.amount || 0,
                totalMatches,
                revenueShare: currentHostFeePercent, // Default or Custom
                lobbyStatuses,
                metrics: {
                    totalPlayers: Math.max(referredPlayers, totalPlayers),
                    totalRevenue: Math.round(totalRevenue * 100) / 100,
                    activeLobbies,
                    totalLobbies,
                    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
                    balance: balance?.amount || 0,
                    totalMatches,
                    revenueShare: currentHostFeePercent,
                },
            };

            res.json({ success: true, data: summary });
        } catch (err) {
            next(err);
        }
    },

    // GET /partner/players
    async getPlayers(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const partner = await prisma.user.findUnique({ where: { id: userId } });

            if (!partner) {
                return res.status(404).json({ success: false, message: 'Partner not found' });
            }

            // Get players referred by this partner
            const referredPlayers = await prisma.user.findMany({
                where: { referrer: partner.username },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    riotGameName: true,
                    riotGameTag: true,
                    createdAt: true,
                    miniTourMatchResults: {
                        select: {
                            id: true,
                            points: true,
                            placement: true,
                        },
                    },
                    miniTourLobbyParticipants: {
                        select: {
                            miniTourLobbyId: true,
                            joinedAt: true,
                        },
                    },
                },
            });

            const players = referredPlayers.map(p => ({
                id: p.id,
                username: p.username,
                email: p.email,
                riotGameName: p.riotGameName || '',
                riotGameTag: p.riotGameTag || '',
                totalPoints: p.miniTourMatchResults.reduce((sum, r) => sum + r.points, 0),
                lobbiesPlayed: new Set(p.miniTourLobbyParticipants.map(part => part.miniTourLobbyId)).size,
                lastPlayed: p.miniTourLobbyParticipants.length > 0
                    ? p.miniTourLobbyParticipants.sort((a, b) =>
                        new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
                    )[0].joinedAt.toISOString()
                    : p.createdAt.toISOString(),
            }));

            res.json({ success: true, data: players });
        } catch (err) {
            next(err);
        }
    },

    // POST /partner/players
    async addPlayer(req: Request, res: Response, next: NextFunction) {
        try {
            const partnerId = (req as any).user.id;
            const partner = await prisma.user.findUnique({ where: { id: partnerId } });

            if (!partner) {
                return res.status(404).json({ success: false, message: 'Partner not found' });
            }

            const { username, email, password, riotGameName, riotGameTag, region } = req.body;

            // Import UserService for registration
            const UserService = (await import('../services/UserService')).default;

            const { user } = await UserService.register({
                username,
                email,
                password: password || 'defaultPassword123',
                gameName: riotGameName,
                tagName: riotGameTag,
                referrer: partner.username,
            });

            res.status(201).json({ success: true, data: user });
        } catch (err) {
            next(err);
        }
    },

    // PUT /partner/players/:id
    async updatePlayer(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { username, email, riotGameName, riotGameTag } = req.body;

            const updateData: any = {};
            if (username) updateData.username = username;
            if (email) updateData.email = email;
            if (riotGameName !== undefined) updateData.riotGameName = riotGameName;
            if (riotGameTag !== undefined) updateData.riotGameTag = riotGameTag;

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    riotGameName: true,
                    riotGameTag: true,
                },
            });

            res.json({ success: true, data: updatedUser });
        } catch (err) {
            next(err);
        }
    },

    // DELETE /partner/players/:id
    async deletePlayer(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            // Soft delete or remove referrer link
            await prisma.user.update({
                where: { id },
                data: { referrer: null },
            });

            res.json({ success: true, message: 'Player removed from partner' });
        } catch (err) {
            next(err);
        }
    },

    // GET /partner/players/:id — detailed player view
    async getPlayerDetail(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const user = await prisma.user.findUnique({
                where: { id },
                include: {
                    balance: true,
                    transactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    },
                    miniTourLobbyParticipants: {
                        include: {
                            miniTourLobby: {
                                select: {
                                    id: true,
                                    name: true,
                                    status: true,
                                    entryFee: true,
                                    prizePool: true,
                                    gameMode: true,
                                },
                            },
                        },
                    },
                    miniTourMatchResults: {
                        include: {
                            miniTourMatch: {
                                select: {
                                    id: true,
                                    matchIdRiotApi: true,
                                    status: true,
                                    miniTourLobbyId: true,
                                    miniTourLobby: {
                                        select: { name: true },
                                    },
                                    createdAt: true,
                                },
                            },
                        },
                        orderBy: { miniTourMatch: { createdAt: 'desc' } },
                    },
                },
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Player not found' });
            }

            // Compute stats
            const results = user.miniTourMatchResults;
            const totalPoints = results.reduce((sum: number, r: any) => sum + r.points, 0);
            const totalMatchesPlayed = results.length;
            const avgPlacement = totalMatchesPlayed > 0
                ? results.reduce((sum: number, r: any) => sum + r.placement, 0) / totalMatchesPlayed
                : 0;
            const firstPlaceCount = results.filter((r: any) => r.placement === 1).length;
            const topFourCount = results.filter((r: any) => r.placement <= 4).length;
            const topFourRate = totalMatchesPlayed > 0 ? Math.round((topFourCount / totalMatchesPlayed) * 100) : 0;
            const firstPlaceRate = totalMatchesPlayed > 0 ? Math.round((firstPlaceCount / totalMatchesPlayed) * 100) : 0;
            const recentPlacements = results.slice(0, 5).map((r: any) => r.placement);

            // Unique lobbies
            const lobbyIds = new Set(user.miniTourLobbyParticipants.map((p: any) => p.miniTourLobbyId));

            // Build lobby stats
            const lobbies = user.miniTourLobbyParticipants.map((p: any) => {
                const lobbyResults = results.filter((r: any) => r.miniTourMatch.miniTourLobbyId === p.miniTourLobbyId);
                return {
                    lobbyId: p.miniTourLobbyId,
                    lobbyName: p.miniTourLobby.name,
                    status: p.miniTourLobby.status,
                    entryFee: p.miniTourLobby.entryFee,
                    prizePool: p.miniTourLobby.prizePool,
                    gameMode: p.miniTourLobby.gameMode,
                    joinedAt: p.joinedAt.toISOString(),
                    totalPoints: lobbyResults.reduce((s: number, r: any) => s + r.points, 0),
                    matchesPlayed: lobbyResults.length,
                    averagePlacement: lobbyResults.length > 0
                        ? lobbyResults.reduce((s: number, r: any) => s + r.placement, 0) / lobbyResults.length
                        : 0,
                };
            });

            // Build match history
            const matchHistory = results.map((r: any) => ({
                matchId: r.miniTourMatch.id,
                matchIdRiotApi: r.miniTourMatch.matchIdRiotApi,
                lobbyId: r.miniTourMatch.miniTourLobbyId,
                lobbyName: r.miniTourMatch.miniTourLobby?.name || 'Unknown',
                placement: r.placement,
                points: r.points,
                status: r.miniTourMatch.status,
                playedAt: r.miniTourMatch.createdAt.toISOString(),
            }));

            const detail = {
                player: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    riotGameName: user.riotGameName,
                    riotGameTag: user.riotGameTag,
                    region: user.region,
                    referrer: user.referrer,
                    rank: user.rank,
                    totalMatchesPlayed: user.totalMatchesPlayed,
                    averagePlacement: user.averagePlacement,
                    topFourRate: user.topFourRate,
                    firstPlaceRate: user.firstPlaceRate,
                    tournamentsPlayed: user.tournamentsPlayed,
                    tournamentsWon: user.tournamentsWon,
                    createdAt: user.createdAt.toISOString(),
                    isActive: user.isActive,
                    balance: user.balance ? {
                        amount: user.balance.amount,
                        updatedAt: user.balance.updatedAt.toISOString(),
                    } : null,
                },
                stats: {
                    totalPoints,
                    totalMatchesPlayed,
                    lobbiesPlayed: lobbyIds.size,
                    averagePlacement: Math.round(avgPlacement * 100) / 100,
                    firstPlaceCount,
                    topFourCount,
                    topFourRate,
                    firstPlaceRate,
                    recentPlacements,
                    totalPointsPerMatch: totalMatchesPlayed > 0
                        ? Math.round((totalPoints / totalMatchesPlayed) * 100) / 100
                        : 0,
                },
                lobbies,
                matchHistory,
                transactions: user.transactions,
            };

            res.json({ success: true, data: detail });
        } catch (err) {
            next(err);
        }
    },

    // GET /partner/export/users
    async exportUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const partner = await prisma.user.findUnique({ where: { id: userId } });

            if (!partner) {
                return res.status(404).json({ success: false, message: 'Partner not found' });
            }

            const players = await prisma.user.findMany({
                where: { referrer: partner.username },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    riotGameName: true,
                    riotGameTag: true,
                    region: true,
                    createdAt: true,
                },
            });

            // Generate CSV
            const csvHeader = 'ID,Username,Email,Riot Game Name,Riot Tag,Region,Created At\n';
            const csvBody = players.map(p =>
                `${p.id},${p.username},${p.email},${p.riotGameName || ''},${p.riotGameTag || ''},${p.region},${p.createdAt.toISOString()}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=partner_players.csv');
            res.send(csvHeader + csvBody);
        } catch (err) {
            next(err);
        }
    },

    // POST /partner/import/players
    async importPlayers(req: Request, res: Response, next: NextFunction) {
        try {
            const partnerId = (req as any).user.id;
            const partner = await prisma.user.findUnique({ where: { id: partnerId } });

            if (!partner) {
                return res.status(404).json({ success: false, message: 'Partner not found' });
            }

            const file = req.file;
            if (!file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const csvContent = file.buffer.toString('utf-8');
            const lines = csvContent.split('\n').filter(l => l.trim());
            const header = lines[0];
            const dataLines = lines.slice(1);

            const UserService = (await import('../services/UserService')).default;

            const imported: any[] = [];
            const errors: any[] = [];

            for (const line of dataLines) {
                const parts = line.split(',').map(p => p.trim());
                const [username, email, password, gameName, tagName] = parts;

                if (!username || !email) {
                    errors.push({ line, error: 'Missing username or email' });
                    continue;
                }

                try {
                    const { user } = await UserService.register({
                        username,
                        email,
                        password: password || 'importedUser123',
                        gameName,
                        tagName,
                        referrer: partner.username,
                    });
                    imported.push(user);
                } catch (err: any) {
                    errors.push({ line, error: err.message });
                }
            }

            res.json({
                success: true,
                data: {
                    imported: imported.length,
                    errors: errors.length,
                    details: errors,
                },
            });
        } catch (err) {
            next(err);
        }
    },

    // POST /partner/transaction
    async processTransaction(req: Request, res: Response, next: NextFunction) {
        try {
            const { playerId, userId: bodyUserId, amount, type } = req.body; // frontend sends playerId
            const userId = playerId || bodyUserId; // accept either field
            const partnerId = (req as any).user.id;

            const result = await prisma.$transaction(async (tx) => {
                // Ensure user has a balance record
                const userBalance = await tx.balance.upsert({
                    where: { userId },
                    update: {},
                    create: { userId, amount: 0 },
                });

                if (type === 'deposit') {
                    // Deposit to user's balance
                    await tx.balance.update({
                        where: { userId },
                        data: { amount: { increment: amount } },
                    });

                    // Create transaction record
                    await tx.transaction.create({
                        data: {
                            userId,
                            type: 'deposit',
                            amount,
                            status: 'success',
                            refId: `partner-${partnerId}`,
                        },
                    });
                } else if (type === 'withdraw') {
                    if (userBalance.amount < amount) {
                        throw new Error('Insufficient balance');
                    }

                    await tx.balance.update({
                        where: { userId },
                        data: { amount: { decrement: amount } },
                    });

                    await tx.transaction.create({
                        data: {
                            userId,
                            type: 'reward',
                            amount: -amount,
                            status: 'success',
                            refId: `partner-withdraw-${partnerId}`,
                        },
                    });
                }

                return tx.balance.findUnique({ where: { userId } });
            });

            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // PUT /partner/settings
    async updateSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { partnerName, contactEmail, hostFeePercent } = req.body;

            // Store settings in user metadata or a separate settings store
            const updateData: any = {};
            if (partnerName) updateData.username = partnerName;
            if (contactEmail) updateData.email = contactEmail;

            if (Object.keys(updateData).length > 0) {
                await prisma.user.update({
                    where: { id: userId },
                    data: updateData,
                });
            }

            // Save hostFeePercent inside PartnerSubscription features
            if (hostFeePercent !== undefined) {
                let boundedFee = parseFloat(hostFeePercent);
                // Partners can only lower host fee, max is 0.10 (10%)
                if (isNaN(boundedFee) || boundedFee < 0) boundedFee = 0;
                if (boundedFee > 0.10) boundedFee = 0.10;

                const sub = await prisma.partnerSubscription.findUnique({ where: { userId } });
                if (sub) {
                    const features = sub.features as any || {};
                    features.hostFeePercent = boundedFee;
                    await prisma.partnerSubscription.update({
                        where: { userId },
                        data: { features }
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    message: "Settings Updated"
                },
            });
        } catch (err) {
            next(err);
        }
    },

    // GET /partner/subscription
    async getSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const targetPartnerId = req.query.targetPartnerId as string;

            const lookupUserId = targetPartnerId || userId;

            let subscription = await prisma.partnerSubscription.findUnique({
                where: { userId: lookupUserId },
            });

            // Fetch live config so we can inject the latest maxLobbies etc.
            const freeConfig = await prisma.subscriptionPlanConfig.findUnique({ where: { plan: 'FREE' } });

            // If no subscription exists, create a FREE one
            if (!subscription) {
                const defaultFeatures = freeConfig ? {
                    ...(freeConfig.features as object),
                    maxLobbies: freeConfig.maxLobbies,
                    maxTournamentSize: freeConfig.maxTournamentSize,
                } : { maxTournamentSize: 32, maxLobbies: 1 };

                subscription = await prisma.partnerSubscription.create({
                    data: {
                        userId: lookupUserId,
                        plan: 'FREE',
                        status: 'ACTIVE',
                        features: defaultFeatures,
                    },
                });
            }

            // Always merge live config so frontend sees latest limits
            const liveConfig = await prisma.subscriptionPlanConfig.findUnique({
                where: { plan: subscription.plan }
            });

            if (liveConfig) {
                subscription.features = {
                    ...(typeof subscription.features === 'object' && subscription.features ? subscription.features : {}),
                    ...(typeof liveConfig.features === 'object' && liveConfig.features ? liveConfig.features : {}),
                    maxLobbies: liveConfig.maxLobbies,
                    maxTournamentSize: liveConfig.maxTournamentSize,
                };
                subscription.monthlyPrice = liveConfig.monthlyPrice;
                subscription.annualPrice = liveConfig.annualPrice;
            }

            const allConfigs = await prisma.subscriptionPlanConfig.findMany();

            // Calculate current usage
            const activeLobbies = await prisma.miniTourLobby.count({
                where: { creatorId: lookupUserId, status: { in: ['WAITING', 'IN_PROGRESS'] } }
            });
            const activeTournaments = await prisma.tournament.count({
                where: { organizerId: lookupUserId, status: { in: ['pending', 'in_progress', 'upcoming'] } }
            });
            
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const tournamentsThisMonth = await prisma.tournament.count({
                where: { organizerId: lookupUserId, createdAt: { gte: startOfMonth } }
            });

            const currentUsage = {
                activeLobbies,
                activeTournaments,
                tournamentsThisMonth
            };

            res.json({
                success: true,
                data: { ...subscription, currentUsage },
                availablePlans: allConfigs
            });
        } catch (err) {
            next(err);
        }
    },

    // POST /partner/subscription/upgrade
    async upgradeSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user.id;
            const { plan } = req.body;

            const liveConfig = await prisma.subscriptionPlanConfig.findUnique({
                where: { plan }
            });

            if (!liveConfig) {
                return res.status(404).json({ success: false, error: `Plan '${plan}' configuration not found` });
            }

            const features = {
                ...(typeof liveConfig.features === 'object' && liveConfig.features ? liveConfig.features : {}),
                maxLobbies: liveConfig.maxLobbies,
                maxTournamentSize: liveConfig.maxTournamentSize,
            };

            const priceToCharge = liveConfig.monthlyPrice || 0;

            const subscription = await prisma.$transaction(async (tx) => {
                const existingSub = await tx.partnerSubscription.findUnique({ where: { userId } });
                const isUpgrade = existingSub?.plan !== plan && priceToCharge > 0;

                let checkoutUrl = '';

                if (isUpgrade) {
                    const serverUrl = process.env.API_URL || 'http://localhost:3001/api/v1';
                    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/partner?tab=plans&upgradeSuccess=true`;
                    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/partner?tab=plans&upgradeCancelled=true`;

                    checkoutUrl = await StripeService.createSubscriptionCheckout({
                        partnerId: userId,
                        plan,
                        priceUsd: priceToCharge,
                        successUrl,
                        cancelUrl
                    });

                    // We do NOT update the plan directly here since they must pay first!
                    return { requiresPayment: true, checkoutUrl };
                }

                return await tx.partnerSubscription.upsert({
                    where: { userId },
                    update: {
                        plan,
                        features,
                        monthlyPrice: liveConfig.monthlyPrice,
                        annualPrice: liveConfig.annualPrice,
                        status: 'ACTIVE',
                    },
                    create: {
                        userId,
                        plan,
                        features,
                        monthlyPrice: liveConfig.monthlyPrice,
                        annualPrice: liveConfig.annualPrice,
                        status: 'ACTIVE',
                    },
                });
            });

            res.json({ success: true, data: subscription });
        } catch (err: any) {
            if (err.message === "Insufficient balance") {
                return res.status(400).json({ success: false, error: 'Insufficient balance to upgrade subscription' });
            }
            next(err);
        }
    },
};
