import { Request, Response } from 'express';
import { prisma } from '../services/prisma';

// GET /partner/rewards — Get partner's rewards
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

// POST /partner/rewards — Create a new reward
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

// PUT /partner/rewards/:id — Update a reward
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

// DELETE /partner/rewards/:id — Delete a reward
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

// GET /public/partner-rewards/:partnerId — Public: get active rewards for a partner (used on lobby cards)
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
