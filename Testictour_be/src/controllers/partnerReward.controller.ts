import { Request, Response } from 'express';
import { prisma } from '../services/prisma';

const isFlexCoinCurrency = (currency?: string | null) => {
    const normalized = (currency || '').toLowerCase();
    return ['coins', 'coin', 'fcoin', 'f_coin', 'flex', 'flex_coin', 'flexcoin'].includes(normalized);
};

export const getPartnerRewards = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id;
        const rewards = await prisma.partnerReward.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { redemptions: true } } },
        });
        return res.json({ success: true, data: rewards });
    } catch (error) {
        console.error('[getPartnerRewards]', error);
        return res.status(500).json({ error: 'Failed to fetch rewards' });
    }
};

export const getRewardCatalog = async (_req: Request, res: Response) => {
    try {
        const now = new Date();
        const rewards = await prisma.partnerReward.findMany({
            where: {
                isActive: true,
                validFrom: { lte: now },
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: now } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                partner: { select: { id: true, username: true } },
                _count: { select: { redemptions: true } },
            },
        });
        return res.json({ success: true, data: rewards });
    } catch (error) {
        console.error('[getRewardCatalog]', error);
        return res.status(500).json({ error: 'Failed to fetch reward catalog' });
    }
};

export const getMyRewardRedemptions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const redemptions = await prisma.partnerRewardRedemption.findMany({
            where: { userId },
            orderBy: { redeemedAt: 'desc' },
            include: {
                reward: {
                    include: {
                        partner: { select: { id: true, username: true } },
                    },
                },
            },
        });
        return res.json({ success: true, data: redemptions });
    } catch (error) {
        console.error('[getMyRewardRedemptions]', error);
        return res.status(500).json({ error: 'Failed to fetch reward redemptions' });
    }
};

export const redeemPartnerReward = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        const result = await prisma.$transaction(async (tx) => {
            const reward = await tx.partnerReward.findUnique({
                where: { id },
                include: { partner: { select: { id: true, username: true } } },
            });

            if (!reward) throw new Error('Reward not found');

            const now = new Date();
            if (!reward.isActive || reward.validFrom > now || (reward.validUntil && reward.validUntil < now)) {
                throw new Error('Reward is not available');
            }
            if (!isFlexCoinCurrency(reward.currency)) {
                throw new Error('This reward is not redeemable with Flex coin');
            }
            if (reward.maxRedemptions !== null && reward.currentRedemptions >= reward.maxRedemptions) {
                throw new Error('Reward is sold out');
            }

            const existing = await tx.partnerRewardRedemption.findFirst({
                where: { rewardId: reward.id, userId, lobbyId: null, tournamentId: null },
            });
            if (existing) throw new Error('You have already redeemed this reward');

            const cost = Math.max(0, reward.value || 0);
            const balance = await tx.balance.upsert({
                where: { userId },
                update: {},
                create: { userId, amount: 0, coins: 0 },
            });
            if (balance.coins < cost) {
                throw new Error(`Insufficient Flex coin. Requires ${cost}, available ${balance.coins}.`);
            }

            if (cost > 0) {
                await tx.balance.update({
                    where: { userId },
                    data: { coins: { decrement: cost } },
                });
                await tx.transaction.create({
                    data: {
                        userId,
                        type: 'reward_redemption',
                        currency: 'coins',
                        amount: -cost,
                        status: 'success',
                        refId: reward.id,
                    },
                });
            }

            const redemption = await tx.partnerRewardRedemption.create({
                data: { rewardId: reward.id, userId },
                include: {
                    reward: {
                        include: {
                            partner: { select: { id: true, username: true } },
                        },
                    },
                },
            });

            await tx.partnerReward.update({
                where: { id: reward.id },
                data: { currentRedemptions: { increment: 1 } },
            });

            return redemption;
        });

        return res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[redeemPartnerReward]', error);
        const message = error?.message || 'Failed to redeem reward';
        return res.status(message === 'Reward not found' ? 404 : 400).json({ error: message, message });
    }
};

export const createPartnerReward = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id;
        const { title, description, type, value, currency, imageUrl, conditions, maxRedemptions, validFrom, validUntil } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        const reward = await prisma.partnerReward.create({
            data: {
                partnerId,
                title,
                description: description || null,
                type: type || 'custom',
                value: value ? parseFloat(value) : 0,
                currency: currency || 'coins',
                imageUrl: imageUrl || null,
                conditions: conditions || null,
                maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null,
            },
        });

        return res.json({ success: true, data: reward });
    } catch (error) {
        console.error('[createPartnerReward]', error);
        return res.status(500).json({ error: 'Failed to create reward' });
    }
};

export const updatePartnerReward = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id;
        const { id } = req.params;
        const { title, description, type, value, currency, imageUrl, isActive, conditions, maxRedemptions, validFrom, validUntil } = req.body;

        const existing = await prisma.partnerReward.findFirst({ where: { id, partnerId } });
        if (!existing) return res.status(404).json({ error: 'Reward not found' });

        const reward = await prisma.partnerReward.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(type !== undefined && { type }),
                ...(value !== undefined && { value: parseFloat(value) }),
                ...(currency !== undefined && { currency }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(isActive !== undefined && { isActive }),
                ...(conditions !== undefined && { conditions }),
                ...(maxRedemptions !== undefined && { maxRedemptions: maxRedemptions === null ? null : parseInt(maxRedemptions) }),
                ...(validFrom !== undefined && { validFrom: new Date(validFrom) }),
                ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
            },
        });

        return res.json({ success: true, data: reward });
    } catch (error) {
        console.error('[updatePartnerReward]', error);
        return res.status(500).json({ error: 'Failed to update reward' });
    }
};

export const deletePartnerReward = async (req: Request, res: Response) => {
    try {
        const partnerId = (req as any).user?.id;
        const { id } = req.params;

        const existing = await prisma.partnerReward.findFirst({ where: { id, partnerId } });
        if (!existing) return res.status(404).json({ error: 'Reward not found' });

        await prisma.partnerReward.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error('[deletePartnerReward]', error);
        return res.status(500).json({ error: 'Failed to delete reward' });
    }
};

export const getPublicPartnerRewards = async (req: Request, res: Response) => {
    try {
        const { partnerId } = req.params;
        const now = new Date();
        const rewards = await prisma.partnerReward.findMany({
            where: {
                partnerId,
                isActive: true,
                validFrom: { lte: now },
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: now } },
                ],
            },
            orderBy: { value: 'desc' },
            select: {
                id: true, title: true, description: true, type: true,
                value: true, currency: true, imageUrl: true,
                conditions: true, validUntil: true,
            },
        });
        return res.json({ success: true, data: rewards });
    } catch (error) {
        console.error('[getPublicPartnerRewards]', error);
        return res.status(500).json({ error: 'Failed to fetch rewards' });
    }
};
