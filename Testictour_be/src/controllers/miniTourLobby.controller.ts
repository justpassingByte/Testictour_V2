import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from '../lib/asyncHandler';
import PrizeCalculationService from '../services/PrizeCalculationService';
import multer from 'multer';
import path from 'path';
import logger from '../utils/logger';
import ApiError from '../utils/ApiError';
import MatchService from '../services/MatchService';
import GrimoireService from '../services/GrimoireService';

const prisma = new PrismaClient();

function getPrizeDistributionObject(distributionString?: string): Record<string, number> | undefined {
  if (!distributionString) return undefined;
  switch (distributionString) {
    case "standard":
      return { "1": 0.5, "2": 0.3, "3": 0.2 };
    case "winner-takes-all":
      return { "1": 1.0 };
    case "top-half":
      return { "1": 0.4, "2": 0.3, "3": 0.2, "4": 0.1 };
    case "custom":
    default:
      return {};
  }
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/miniTourLobbies'); // Directory to save uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

// @desc    Create a new MiniTour Lobby
// @route   POST /api/minitour-lobbies
// @access  Public (for now, can add auth later)
export const createMiniTourLobby = asyncHandler(async (req: Request, res: Response) => {
  console.log("Received request body:", req.body);
  const {
    name,
    description,
    image = null, // Default to null if not provided
    maxPlayers,
    entryFee,
    entryType,
    gameMode,
    skillLevel,
    theme,
    tags = '', // Default to empty string if not provided
    rules: rulesString, // Rename to avoid conflict with processed rules
    prizeDistribution: prizeDistributionString,
    autoStart,
    privateMode,
    totalMatches,
  } = req.body;

  // Parse stringified values from FormData
  const parsedTags: string[] = tags ? String(tags).split(',') : [];
  // Rules are now sent as a plain string, parse them into an array
  const parsedRules: string[] = rulesString
    ? String(rulesString).split("\n").map((rule: string) => rule.trim()).filter(Boolean)
    : [];
  const parsedAutoStart: boolean = autoStart === 'true';
  const parsedPrivateMode: boolean = privateMode === 'true';
  const parsedTotalMatches = totalMatches ? Number(totalMatches) : 3; // Default to 3 matches

  const maxPlayersNum = Number(maxPlayers); // Explicitly convert to number
  const entryFeeNum = Number(entryFee); // Explicitly convert to number

  const customLogoUrl = req.file ? `/uploads/miniTourLobbies/${req.file.filename}` : null; // Get uploaded file path

  const creatorId = (req as any).user.id; // Get creatorId from authenticated user

  // Subscription plan limit enforcement for partners
  const creatorUser = await prisma.user.findUnique({ where: { id: creatorId } });
  if (creatorUser && (creatorUser.role === 'PARTNER' || creatorUser.role === 'partner')) {
    const sub = await prisma.partnerSubscription.findUnique({ where: { userId: creatorId } });
    const planName = sub?.plan || 'FREE';
    const planConfig = await prisma.subscriptionPlanConfig.findUnique({ where: { plan: planName } });

    // Default to FREE limits if not found
    const maxLobbies = planConfig ? planConfig.maxLobbies : 5;

    // -1 means unlimited
    if (maxLobbies !== -1) {
      // Count existing active or total lobbies? Usually it's total active or just total created.
      // Let's count all non-cancelled/completed lobbies or just all lobbies to be safe.
      // E.g active lobbies: WAITING and IN_PROGRESS
      const activeLobbyCount = await prisma.miniTourLobby.count({
        where: {
          creatorId,
          status: { in: ['WAITING', 'IN_PROGRESS'] }
        }
      });

      if (activeLobbyCount >= maxLobbies) {
        res.status(403);
        throw new Error(`You have reached the maximum number of active lobbies (${maxLobbies}) for your ${planName} subscription.`);
      }
    }
  }

  // Basic validation
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400);
    throw new Error('Lobby name is required and must be a non-empty string.');
  }
  if (isNaN(maxPlayersNum) || maxPlayersNum < 2) { // Validate numeric conversion
    res.status(400);
    throw new Error('Max players is required and must be a number greater than or equal to 2.');
  }
  if (isNaN(entryFeeNum) || entryFeeNum < 0) { // Validate numeric conversion
    res.status(400);
    throw new Error('Entry fee cannot be negative and must be a valid number.');
  }
  if (!gameMode || gameMode.trim() === '') {
    res.status(400);
    throw new Error('Game mode is required.');
  }
  if (!skillLevel || skillLevel.trim() === '') {
    res.status(400);
    throw new Error('Skill level is required.');
  }
  if (!theme || theme.trim() === '') {
    res.status(400);
    throw new Error('Theme is required.');
  }

  const prizeDistribution = getPrizeDistributionObject(prizeDistributionString);
  if (prizeDistribution === undefined) {
    res.status(400);
    throw new Error('Invalid prize distribution format.');
  }

  const lobby = await prisma.miniTourLobby.create({
    data: {
      name,
      description,
      image: customLogoUrl, // Use the uploaded image URL
      maxPlayers: maxPlayersNum, // Use the converted number
      entryFee: entryFeeNum, // Use the converted number
      entryType,
      prizePool: 0, // Initial prizePool is 0, updated on participant join
      gameMode,
      skillLevel,
      theme,
      customLogoUrl, // Store the custom logo URL
      tags: parsedTags, // Use the parsed tags array
      rules: parsedRules, // Use the parsed rules array
      prizeDistribution,
      settings: { // Group these into a settings object
        autoStart: parsedAutoStart, // Use parsed boolean
        privateMode: parsedPrivateMode, // Use parsed boolean
      },
      status: "WAITING", // Initial status
      currentPlayers: 0, // Initial currentPlayers
      averageRating: 0,
      totalMatches: parsedTotalMatches, // Use parsed number
      creator: { connect: { id: creatorId } }, // Assign the creatorId using connect
    },
  });

  res.status(201).json({ success: true, data: lobby });
});

// @desc    Get all MiniTour Lobbies
// @route   GET /api/minitour-lobbies
// @access  Public
export const getMiniTourLobbies = asyncHandler(async (req: Request, res: Response) => {
  const lobbies = await prisma.miniTourLobby.findMany({
    include: {
      creator: {
        select: { id: true, username: true, email: true },
      },
      participants: true,
      matches: {
        include: {
          miniTourMatchResults: {
            include: { user: { select: { id: true, username: true, riotGameName: true, riotGameTag: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json({ success: true, data: lobbies });
});

// @desc    Get single MiniTour Lobby by ID
// @route   GET /api/minitour-lobbies/:id
// @access  Public
export const getMiniTourLobbyById = asyncHandler(async (req: Request, res: Response) => {
  const lobby = await prisma.miniTourLobby.findUnique({
    where: { id: req.params.id },
    include: {
      participants: { include: { user: true } },
      matches: {
        include: {
          miniTourMatchResults: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      },
    },
  });

  if (!lobby) {
    res.status(404);
    throw new Error('Lobby not found');
  }

  res.status(200).json({ success: true, data: { ...lobby, ownerId: lobby.creatorId } });
});

// @desc    Update a MiniTour Lobby by ID
// @route   PUT /api/minitour-lobbies/:id
// @access  Private (Lobby creator only)
export const updateMiniTourLobby = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  if (!user) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const lobby = await prisma.miniTourLobby.findUnique({
    where: { id },
  });

  if (!lobby) {
    res.status(404);
    throw new Error("Lobby not found");
  }

  const isCreator = lobby.creatorId === user.id;
  const isPartner = user.role === 'PARTNER';
  const isAdmin = user.role === 'ADMIN';

  if (!isCreator && !isPartner && !isAdmin) {
    res.status(403);
    throw new Error("User not authorized to update this lobby");
  }

  const {
    name,
    description,
    maxPlayers,
    entryFee,
    entryType,
    gameMode,
    skillLevel,
    theme,
    tags,
    rules,
    prizeDistribution,
    autoStart,
    privateMode,
    totalMatches,
  } = req.body;

  // Repurposing validation and parsing from create function
  const parsedRules = rules ? String(rules).split("\n").map(rule => rule.trim()).filter(Boolean) : lobby.rules;
  const parsedAutoStart = autoStart === 'true';
  const parsedPrivateMode = privateMode === 'true';
  const parsedTotalMatches = totalMatches ? Number(totalMatches) : 3; // Default to 3 matches
  const maxPlayersNum = Number(maxPlayers);
  const entryFeeNum = Number(entryFee);
  const customLogoUrl = req.file ? `/uploads/miniTourLobbies/${req.file.filename}` : lobby.customLogoUrl;

  const dataToUpdate: any = {
    name: name || lobby.name,
    description: description || lobby.description,
    maxPlayers: !isNaN(maxPlayersNum) ? maxPlayersNum : lobby.maxPlayers,
    entryFee: !isNaN(entryFeeNum) ? entryFeeNum : lobby.entryFee,
    entryType: entryType || lobby.entryType,
    gameMode: gameMode || lobby.gameMode,
    skillLevel: skillLevel || lobby.skillLevel,
    theme: theme || lobby.theme,
    customLogoUrl: customLogoUrl,
    rules: parsedRules,
    settings: {
      autoStart: parsedAutoStart,
      privateMode: parsedPrivateMode,
    },
  };

  if (totalMatches) {
    const totalMatchesNum = Number(totalMatches);
    if (!isNaN(totalMatchesNum) && totalMatchesNum > 0) {
      dataToUpdate.totalMatches = totalMatchesNum;
    }
  }

  if (tags) {
    dataToUpdate.tags = String(tags).split(',');
  }

  const newPrizeDistribution = getPrizeDistributionObject(prizeDistribution as string);
  if (newPrizeDistribution) {
    dataToUpdate.prizeDistribution = newPrizeDistribution;
  }

  const updatedLobby = await prisma.miniTourLobby.update({
    where: { id },
    data: dataToUpdate,
  });

  res.status(201).json({ success: true, data: updatedLobby });
});

// @desc    Delete a MiniTour Lobby by ID
// @route   DELETE /api/minitour-lobbies/:id
// @access  Private (Lobby creator or Admin)
export const deleteMiniTourLobby = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  if (!user) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const lobby = await prisma.miniTourLobby.findUnique({
    where: { id },
  });

  if (!lobby) {
    res.status(404);
    throw new Error("Lobby not found");
  }

  // Authorization check
  const isCreator = lobby.creatorId === user.id;
  const isPartner = user.role === 'PARTNER';
  const isAdmin = user.role === 'ADMIN';

  if (!isCreator && !isPartner && !isAdmin) {
    res.status(403);
    throw new Error("User not authorized to delete this lobby");
  }

  // Before deleting the lobby, we might need to handle related records if cascade deletes are not set up
  // For example, deleting associated participants or notifications
  // For now, assuming cascade delete is on or relations are handled.

  await prisma.miniTourLobby.delete({
    where: { id },
  });

  res.status(200).json({ success: true, data: {} });
});

// @desc    Join a MiniTour Lobby
// @route   POST /api/minitour-lobbies/:id/join
// @access  Private (requires user to be logged in)
export const joinMiniTourLobby = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id; // Get userId from authenticated user

  // Use a transaction to ensure atomicity for balance, lobby, and participant updates
  const result = await prisma.$transaction(async (prisma) => {
    const lobby = await prisma.miniTourLobby.findUnique({ where: { id } });

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status !== 'WAITING') {
      throw new Error('Cannot join a lobby that is not in WAITING status.');
    }

    if (lobby.currentPlayers >= lobby.maxPlayers) {
      throw new Error('Lobby is full.');
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.miniTourLobbyParticipant.findUnique({
      where: { miniTourLobbyId_userId: { miniTourLobbyId: id, userId: userId } },
    });

    if (existingParticipant) {
      return res.status(409).json({ message: 'Bạn đã ở trong sảnh này rồi.' });
    }

    // Fetch user's balance
    let userBalance = await prisma.balance.findUnique({
      where: { userId: userId },
    });

    if (!userBalance) {
      // If no balance record exists, create one with 0 amount
      userBalance = await prisma.balance.upsert({
        where: { userId: userId },
        update: {},
        create: { userId: userId, amount: 0 },
      });
    }

    if (userBalance.amount < lobby.entryFee) {
      throw new Error(`Insufficient coins. Requires ${lobby.entryFee}, but user has ${userBalance.amount}.`);
    }

    // 1. Trừ phí vào cửa từ số dư của người dùng
    await prisma.balance.update({
      where: { userId: userId },
      data: { amount: { decrement: lobby.entryFee } },
    });

    // 2. Tính toán các khoản phí
    const CREATOR_FEE_PERCENT = 0.10; // 10% cho người tạo sảnh
    const PLATFORM_FEE_PERCENT = 0.10; // 10% cho nền tảng
    const creatorFee = lobby.entryFee * CREATOR_FEE_PERCENT;
    const platformFee = lobby.entryFee * PLATFORM_FEE_PERCENT;
    const distributableAmount = lobby.entryFee - creatorFee - platformFee;

    // 3. Chuyển phí cho người tạo sảnh (Giả định người tạo đã có bản ghi số dư)
    if (creatorFee > 0) {
      await prisma.balance.update({
        where: { userId: lobby.creatorId },
        data: { amount: { increment: creatorFee } },
      });
    }

    // 4. Chuyển phí cho nền tảng (Giả định tài khoản hệ thống đã có bản ghi số dư)
    if (platformFee > 0) {
      await prisma.balance.update({
        where: { userId: 'SYSTEM_USER_ID' },
        data: { amount: { increment: platformFee } },
      });
    }

    // 5. Ghi lại giao dịch chính cho người dùng
    await prisma.transaction.create({
      data: {
        userId: userId, type: 'entry_fee', amount: -lobby.entryFee, status: 'success', refId: id,
      },
    });

    // 6. Thêm người dùng vào danh sách tham gia
    await prisma.miniTourLobbyParticipant.create({
      data: {
        miniTourLobby: { connect: { id } },
        user: { connect: { id: userId } },
      },
    });

    // 7. Cập nhật lobby với số người chơi và tổng giải thưởng có thể phân phối
    const updatedLobby = await prisma.miniTourLobby.update({
      where: { id },
      data: {
        currentPlayers: { increment: 1 },
        prizePool: { increment: distributableAmount },
      },
    });

    return updatedLobby;
  });

  res.status(200).json({ success: true, data: result });
});

// @desc    Start a MiniTour Lobby game
// @route   POST /api/minitour-lobbies/:id/start
// @access  Public (any player can start)
export const startMiniTourLobbyInternal = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the lobby and its current participants with user details
    const lobby = await tx.miniTourLobby.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                puuid: true,
                region: true,
              },
            },
          },
        },
        creator: { select: { region: true } },
        matches: { select: { id: true } } // Fetch matches to know if it's the 1st match
      },
    });

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // A new match can be started as long as the lobby is not completed or cancelled
    if (lobby.status === 'COMPLETED' || lobby.status === 'CANCELLED') {
      throw new Error('Cannot start a new match in a completed or cancelled lobby.');
    }

    // Check for minimum players
    if (lobby.participants.length < 2) {
      throw new Error('Not enough players in the lobby to start a new match.');
    }

    // BO1/Infinite Mode: Check if this is a subsequent match
    const isInfinite = lobby.totalMatches === -1 || lobby.totalMatches === 0;
    let addedPrizePool = 0;
    
    if (isInfinite && lobby.matches.length > 0 && lobby.entryFee > 0) {
      // Need to deduct entry fee for all players for Match N
      for (const p of lobby.participants) {
        const userBalance = await tx.balance.findUnique({ where: { userId: p.userId } });
        if (!userBalance || userBalance.amount < lobby.entryFee) {
          throw new Error(`Cannot start: Player ${p.user.id} does not have enough coins (${lobby.entryFee}) for the next match.`);
        }
        
        await tx.balance.update({
          where: { userId: p.userId },
          data: { amount: { decrement: lobby.entryFee } }
        });

        // Split fees
        const CREATOR_FEE_PERCENT = 0.10;
        const PLATFORM_FEE_PERCENT = 0.10;
        const creatorFee = lobby.entryFee * CREATOR_FEE_PERCENT;
        const platformFee = lobby.entryFee * PLATFORM_FEE_PERCENT;
        const distributable = lobby.entryFee - creatorFee - platformFee;

        if (creatorFee > 0) {
          await tx.balance.update({
            where: { userId: lobby.creatorId },
            data: { amount: { increment: creatorFee } }
          });
        }

        if (platformFee > 0) {
          await tx.balance.update({
            where: { userId: 'SYSTEM_USER_ID' },
            data: { amount: { increment: platformFee } }
          });
        }

        await tx.transaction.create({
          data: {
            userId: p.userId, type: 'entry_fee', amount: -lobby.entryFee, status: 'success', refId: id,
          }
        });

        addedPrizePool += distributable;
      }
    }

    // 2. Create a new placeholder match with a start time.
    logger.info(`Creating a placeholder match for lobby ${id}.`);
    const startTime = new Date(); // Ghi lại thời gian bắt đầu

    const newMiniTourMatch = await tx.miniTourMatch.create({
      data: {
        miniTourLobbyId: id,
        status: 'PENDING',
        startTime: startTime, // Lưu thời gian bắt đầu
        miniTourMatchResults: {
          create: lobby.participants.map(p => ({
            userId: p.user.id,
            placement: 0,
            points: 0,
          })),
        },
      },
    });

    // 3. Update lobby status
    const dataToUpdate: any = {};

    // If this is the first match, update lobby status to IN_PROGRESS
    if (lobby.status === 'WAITING') {
      dataToUpdate.status = 'IN_PROGRESS';
    }

    if (addedPrizePool > 0) {
       dataToUpdate.prizePool = { increment: addedPrizePool };
    }

    const updatedLobbyState = await tx.miniTourLobby.update({
      where: { id },
      data: dataToUpdate,
    });

    logger.info(`Created placeholder MiniTourMatch ${newMiniTourMatch.id} for lobby ${id}.`);

    // 4. Return the full, updated lobby state
    return tx.miniTourLobby.findUnique({
      where: { id },
      include: {
        participants: { include: { user: true } },
        matches: {
          include: { miniTourMatchResults: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  });
};

export const startMiniTourLobby = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatedLobby = await startMiniTourLobbyInternal(id);
  res.status(200).json({ success: true, data: updatedLobby });
});

// @desc    Fetch and process MiniTour Lobby game results
// @route   POST /api/minitour-lobbies/:id/fetch-result
// @access  Public (any player can fetch result)
export const fetchMiniTourLobbyResult = asyncHandler(async (req: Request, res: Response) => {
  const { id: lobbyId } = req.params; // Renamed to lobbyId for clarity

  // Use a transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    const lobby = await tx.miniTourLobby.findUnique({
      where: { id: lobbyId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, puuid: true, region: true },
            },
          },
        },
        matches: {
          where: { status: 'PENDING' }, // Target the pending match
          orderBy: { createdAt: 'desc' },
          take: 1,
        }, // Include only the latest pending match
      },
    });

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status === 'COMPLETED' || lobby.status === 'CANCELLED') {
      throw new Error('Cannot fetch results for a completed or cancelled lobby.');
    }

    // Get the pending match, if any
    const pendingMatch = lobby.matches[0];
    if (!pendingMatch) {
      throw new Error('No pending match found for this lobby to fetch results. Please start a match first.');
    }

    const targetParticipantsPuids = lobby.participants.map(p => p.user.puuid).filter(Boolean) as string[];
    const region = lobby.participants[0].user.region || 'sea'; // Default region, ideally from creator or lobby settings

    if (targetParticipantsPuids.length === 0) {
      throw new Error('No participants with PUUIDs found to search for a Riot match.');
    }

    let riotMatchId = pendingMatch.matchIdRiotApi;

    // If riotMatchId is not yet found for the pending match, try to find it
    if (!riotMatchId) {
      const searchStartTime = 1751122848;
      const searchEndTime = 1751133648;

      logger.info(`fetchMiniTourLobbyResult: Attempting to find Riot match with:`
        + ` lobbyId=${lobbyId}, pendingMatchId=${pendingMatch.id}, `
        + `targetParticipantsPuids=${JSON.stringify(targetParticipantsPuids)}, `
        + `region=${region}, searchStartTime=${searchStartTime} (epoch seconds), `
        + `searchEndTime=${searchEndTime} (epoch seconds)`);

      riotMatchId = await MatchService.findMatchByCriteria(
        targetParticipantsPuids,
        region,
        searchStartTime,
        searchEndTime
      );

      if (!riotMatchId) {
        // If no Riot match is found, perhaps update the local match status to indicate failure or no match found
        // For now, we throw an error. Frontend needs to handle this.
        throw new Error('No corresponding Riot match found within the specified time frame. Please ensure players played a match recently and API keys are valid.');
      }

      // Update the pending match with the found Riot Match ID
      await tx.miniTourMatch.update({
        where: { id: pendingMatch.id },
        data: { matchIdRiotApi: riotMatchId },
      });
    }

    // Now, queue the actual processing of results and payout asynchronously
    // The worker (to be implemented/configured) will fetch Riot data, update results, and distribute prizes.
    await MatchService.queueMiniTourMatchSync(pendingMatch.id, riotMatchId, region);

    // Update lobby status if all matches are completed. This logic should be refined in the worker.
    // For simplicity, for now, we'll assume queuing means it's considered 'processed' from this endpoint's view.
    // A more robust solution might have a `lobby.status` check for all matches to be completed within the worker.
    // Or, move this lobby status update to be triggered only after the worker successfully completes processing.
    // For this refactor, we are just queuing the job and returning a success.

    // Return a simple success message, as the actual results will be processed asynchronously
    return {
      message: 'Match results processing has been queued.',
      miniTourMatchId: pendingMatch.id,
      riotMatchId: riotMatchId,
    };
  });

  res.status(202).json({ success: true, data: result }); // 202 Accepted for async processing
});

// @desc    Leave a MiniTour Lobby
// @route   POST /api/minitour-lobbies/:id/leave
// @access  Private (requires user to be logged in)
export const leaveMiniTourLobby = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // lobbyId
  const userId = (req as any).user.id; // authenticated userId

  const result = await prisma.$transaction(async (tx) => {
    // 1. Find the participant record to ensure they are in the lobby
    const participant = await tx.miniTourLobbyParticipant.findUnique({
      where: {
        miniTourLobbyId_userId: {
          miniTourLobbyId: id,
          userId: userId,
        },
      },
      include: {
        miniTourLobby: true, // Include lobby to get entryFee and status
      },
    });

    if (!participant) {
      throw new ApiError(404, 'You are not a participant in this lobby.');
    }

    const { miniTourLobby } = participant;

    if (miniTourLobby.status !== 'WAITING') {
      throw new ApiError(400, 'Cannot leave a lobby that has already started or finished.');
    }

    // 2. Refund the entry fee to the user's balance
    await tx.balance.update({
      where: { userId: userId },
      data: { amount: { increment: miniTourLobby.entryFee } },
    });

    // 3. Create a refund transaction record for traceability
    await tx.transaction.create({
      data: {
        userId: userId,
        type: 'entry_fee_refund',
        amount: miniTourLobby.entryFee,
        status: 'success',
        refId: id, // Reference to the lobby ID
      },
    });

    // 4. Reverse the fee calculations from the prize pool and system/creator balances
    const CREATOR_FEE_PERCENT = 0.10;
    const PLATFORM_FEE_PERCENT = 0.10;
    const creatorFee = miniTourLobby.entryFee * CREATOR_FEE_PERCENT;
    const platformFee = miniTourLobby.entryFee * PLATFORM_FEE_PERCENT;
    const distributableAmount = miniTourLobby.entryFee - creatorFee - platformFee;

    // Decrement creator's balance
    if (creatorFee > 0 && miniTourLobby.creatorId) {
      await tx.balance.update({
        where: { userId: miniTourLobby.creatorId },
        data: { amount: { decrement: creatorFee } }
      });
    }

    // Decrement platform's balance
    if (platformFee > 0) {
      await tx.balance.update({
        where: { userId: 'SYSTEM_USER_ID' },
        data: { amount: { decrement: platformFee } }
      });
    }

    // 5. Remove the participant record from the lobby
    await tx.miniTourLobbyParticipant.delete({
      where: {
        miniTourLobbyId_userId: {
          miniTourLobbyId: id,
          userId: userId,
        },
      },
    });

    // 6. Update the lobby's player count and prize pool
    const updatedLobby = await tx.miniTourLobby.update({
      where: { id },
      data: {
        currentPlayers: { decrement: 1 },
        prizePool: { decrement: distributableAmount },
      },
      include: {
        participants: { include: { user: true } },
        matches: {
          include: {
            miniTourMatchResults: {
              include: {
                user: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    return updatedLobby;
  });

  res.status(200).json({ success: true, message: "Successfully left the lobby.", data: result });
});

// @desc    Assign a player to a MiniTour Lobby (by Partner/Admin)
// @route   POST /api/minitour-lobbies/:id/assign-player
// @access  Private (requires partner or admin role)
export const assignPlayerToLobby = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // lobbyId
  const { userId } = req.body; // userId to be assigned
  const currentUser = (req as any).user; // Authenticated user initiating the assignment

  if (!currentUser || (currentUser.role !== 'partner' && currentUser.role !== 'admin')) {
    res.status(403);
    throw new Error("User not authorized to assign players to this lobby");
  }

  const result = await prisma.$transaction(async (tx) => {
    const lobby = await tx.miniTourLobby.findUnique({ where: { id } });

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status !== 'WAITING') {
      throw new Error('Cannot assign players to a lobby that is not in WAITING status.');
    }

    if (lobby.currentPlayers >= lobby.maxPlayers) {
      throw new Error('Lobby is full.');
    }

    // Check if user is already a participant
    const existingParticipant = await tx.miniTourLobbyParticipant.findUnique({
      where: { miniTourLobbyId_userId: { miniTourLobbyId: id, userId: userId } },
    });

    if (existingParticipant) {
      return res.status(409).json({ message: 'Người chơi đã ở trong sảnh này rồi.' });
    }

    // Add the user as a participant without handling fees/prize pool
    await tx.miniTourLobbyParticipant.create({
      data: {
        miniTourLobby: { connect: { id } },
        user: { connect: { id: userId } },
      },
    });

    // Update the lobby's player count
    const updatedLobby = await tx.miniTourLobby.update({
      where: { id },
      data: {
        currentPlayers: { increment: 1 },
      },
      include: {
        participants: { include: { user: true } },
        matches: { include: { miniTourMatchResults: { include: { user: true } } }, orderBy: { createdAt: 'asc' } }
      }
    });

    return updatedLobby;
  });

  res.status(200).json({ success: true, data: result });
});

// @desc    Submit manual match result
// @route   POST /api/minitour-lobbies/:id/manual-result
// @access  Private (partner/admin)
export const submitManualResult = asyncHandler(async (req: Request, res: Response) => {
  const { id: lobbyId } = req.params;
  const { placements } = req.body; // Array of { userId, placement }

  const result = await prisma.$transaction(async (tx) => {
    const lobby = await tx.miniTourLobby.findUnique({
      where: { id: lobbyId },
      include: {
        participants: true,
        matches: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.status === 'COMPLETED' || lobby.status === 'CANCELLED') {
      throw new Error('Cannot submit results for a completed or cancelled lobby.');
    }

    // Find existing PENDING match or create a new one
    let pendingMatch = lobby.matches.find(m => m.status === 'PENDING');

    if (!pendingMatch) {
      // Create a new match
      pendingMatch = await tx.miniTourMatch.create({
        data: {
          miniTourLobbyId: lobbyId,
          status: 'PENDING',
          startTime: new Date(),
        },
      });
    }

    // Delete existing results for this match (if re-submitting)
    await tx.miniTourMatchResult.deleteMany({
      where: { miniTourMatchId: pendingMatch.id },
    });

    // Points mapping based on placement
    const pointsMap: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1 };

    // Create new results
    for (const p of placements) {
      await tx.miniTourMatchResult.create({
        data: {
          miniTourMatchId: pendingMatch.id,
          userId: p.userId,
          placement: p.placement,
          points: pointsMap[p.placement] || 0,
        },
      });
    }

    // Mark match as completed
    await tx.miniTourMatch.update({
      where: { id: pendingMatch.id },
      data: {
        status: 'COMPLETED',
        fetchedAt: new Date(),
      },
    });

    const totalCompletedMatches = lobby.matches.filter(m => m.status === 'COMPLETED').length + 1;
    if (totalCompletedMatches >= lobby.totalMatches && lobby.totalMatches > 0) {
      await tx.miniTourLobby.update({
        where: { id: lobbyId },
        data: { status: 'COMPLETED' },
      });
    }

    // Return updated lobby
    return tx.miniTourLobby.findUnique({
      where: { id: lobbyId },
      include: {
        participants: { include: { user: true } },
        matches: {
          include: { miniTourMatchResults: { include: { user: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  res.status(200).json({ success: true, data: result ? { ...result, ownerId: result.creatorId } : null });
});

// @desc    Sync all pending matches in a lobby
// @route   POST /api/minitour-lobbies/:id/sync-all
// @access  Private (partner/admin)
export const syncAllLobbyMatches = asyncHandler(async (req: Request, res: Response) => {
  const { id: lobbyId } = req.params;

  const lobby = await prisma.miniTourLobby.findUnique({
    where: { id: lobbyId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, puuid: true, region: true },
          },
        },
      },
      matches: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!lobby) {
    res.status(404);
    throw new Error('Lobby not found');
  }

  const pendingMatches = lobby.matches;
  if (pendingMatches.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No pending matches to sync.',
      data: { synced: 0 },
    });
  }

  const region = lobby.participants[0]?.user?.region || 'sea';
  let queuedCount = 0;

  for (const match of pendingMatches) {
    if (match.matchIdRiotApi) {
      try {
        await MatchService.queueMiniTourMatchSync(match.id, match.matchIdRiotApi, region);
        queuedCount++;
      } catch (err) {
        logger.error(`Failed to queue sync for match ${match.id}: ${err}`);
      }
    }
  }

  res.status(202).json({
    success: true,
    message: `Queued ${queuedCount} matches for syncing.`,
    data: { synced: queuedCount, total: pendingMatches.length },
  });
});

// @desc    Fetch match results via Grimoire's internal API (enriched with icons)
// @route   POST /api/minitour-lobbies/:id/fetch-match-grimoire
// @access  Public
export const fetchMatchFromGrimoire = asyncHandler(async (req: Request, res: Response) => {
  const { id: lobbyId } = req.params;

  const lobby = await prisma.miniTourLobby.findUnique({
    where: { id: lobbyId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, puuid: true, region: true, riotGameName: true, riotGameTag: true },
          },
        },
      },
      matches: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!lobby) {
    throw new ApiError(404, 'Lobby not found');
  }

  if (lobby.status === 'COMPLETED' || lobby.status === 'CANCELLED') {
    throw new ApiError(400, 'Cannot fetch results for a completed or cancelled lobby.');
  }

  const pendingMatch = lobby.matches[0];
  if (!pendingMatch) {
    throw new ApiError(400, 'No pending match found. Start a match first.');
  }

  // Get all participant PUUIDs
  const allPuuids = lobby.participants
    .map(p => p.user.puuid)
    .filter(Boolean) as string[];

  if (allPuuids.length === 0) {
    throw new ApiError(400, 'No participants with PUUIDs found.');
  }

  // Pick 1-2 players for polling, use their actual region
  const pollingPuuids = allPuuids.slice(0, 2);
  const region = lobby.participants[0]?.user?.region;

  if (!region) {
    throw new ApiError(400, 'No region found for participants. Ensure players have region set in their profile.');
  }

  // Use match startTime as search start (minus 5 min buffer)
  const startTime = pendingMatch.startTime
    ? Math.floor(pendingMatch.startTime.getTime() / 1000) - 300
    : Math.floor(Date.now() / 1000) - 3600; // fallback: 1 hour ago

  logger.info(`[fetchMatchFromGrimoire] Polling Grimoire for lobby=${lobbyId}, match=${pendingMatch.id}, pollingPuuids=${pollingPuuids.join(',')}, region=${region}`);

  const result = await GrimoireService.fetchLatestMatch(
    pollingPuuids,
    region,
    startTime,
    undefined,
    allPuuids,
  );

  if (!result.match) {
    return res.json({
      success: true,
      found: false,
      message: result.message || 'No match found yet. Game may still be in progress.',
    });
  }

  // Match found! Save the enriched data and update the match record
  const grimoireMatch = result.match;

  // Build summarized matchData with enriched icons
  const matchData = {
    matchId: grimoireMatch.matchId,
    gameCreation: grimoireMatch.gameCreation,
    gameDuration: grimoireMatch.gameDuration,
    gameVersion: grimoireMatch.gameVersion,
    participants: grimoireMatch.participants,
  };

  // Points mapping
  const pointsMap: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2, 6: 1, 7: 0, 8: 0 };

  // Transaction: update match + create results
  const updatedLobby = await prisma.$transaction(async (tx) => {
    // Delete old placeholder results
    await tx.miniTourMatchResult.deleteMany({
      where: { miniTourMatchId: pendingMatch.id },
    });

    // Create results from Grimoire data
    for (const participant of grimoireMatch.participants) {
      // Find matching lobby participant by PUUID
      const lobbyParticipant = lobby.participants.find(
        p => p.user.puuid === participant.puuid
      );

      if (lobbyParticipant) {
        await tx.miniTourMatchResult.create({
          data: {
            miniTourMatchId: pendingMatch.id,
            userId: lobbyParticipant.user.id,
            placement: participant.placement,
            points: pointsMap[participant.placement] || 0,
          },
        });
      }
    }

    // Update the match with enriched data
    await tx.miniTourMatch.update({
      where: { id: pendingMatch.id },
      data: {
        matchIdRiotApi: grimoireMatch.matchId,
        matchData: matchData as any,
        status: 'COMPLETED',
        fetchedAt: new Date(),
      },
    });

    // Check if all matches are completed
    const allMatches = await tx.miniTourMatch.findMany({
      where: { miniTourLobbyId: lobbyId },
    });
    const completedCount = allMatches.filter(m => m.status === 'COMPLETED').length;

    if (completedCount >= lobby.totalMatches && lobby.totalMatches > 0) {
      await tx.miniTourLobby.update({
        where: { id: lobbyId },
        data: { status: 'COMPLETED' },
      });
    }

    // Return updated lobby
    return tx.miniTourLobby.findUnique({
      where: { id: lobbyId },
      include: {
        participants: { include: { user: true } },
        matches: {
          include: { miniTourMatchResults: { include: { user: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  logger.info(`[fetchMatchFromGrimoire] Match ${grimoireMatch.matchId} saved for lobby ${lobbyId}`);

  res.json({
    success: true,
    found: true,
    data: updatedLobby ? { ...updatedLobby, ownerId: updatedLobby.creatorId } : null,
  });
}); 