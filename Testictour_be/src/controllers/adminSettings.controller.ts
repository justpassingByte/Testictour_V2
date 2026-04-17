import { Request, Response } from 'express';
import { prisma } from '../services/prisma';

// ─── Platform Settings ───────────────────────────────────────────────

// GET /admin/settings
export const getSettings = async (_req: Request, res: Response) => {
    try {
        const settings = await prisma.platformSetting.findMany({
            orderBy: [{ group: 'asc' }, { key: 'asc' }],
        });

        // Group by category
        const grouped = settings.reduce((acc, s) => {
            if (!acc[s.group]) acc[s.group] = [];
            acc[s.group].push({
                ...s,
                parsedValue: s.type === 'boolean' ? s.value === 'true'
                    : s.type === 'number' ? parseFloat(s.value)
                        : s.value,
            });
            return acc;
        }, {} as Record<string, any[]>);

        return res.json({ settings: grouped });
    } catch (error) {
        console.error('[getSettings]', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

// PUT /admin/settings/:key
export const updateSetting = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const adminId = (req as any).user?.id;

        if (value === undefined) {
            return res.status(400).json({ error: 'value is required' });
        }

        const existing = await prisma.platformSetting.findUnique({ where: { key } });
        if (!existing) return res.status(404).json({ error: `Setting '${key}' not found` });

        // Validate numeric settings
        if (existing.type === 'number' && isNaN(parseFloat(String(value)))) {
            return res.status(400).json({ error: `Setting '${key}' must be a number` });
        }

        const updated = await prisma.platformSetting.update({
            where: { key },
            data: { value: String(value), updatedBy: adminId },
        });

        // If maintenance mode changed, emit to all connected clients
        if (key === 'maintenance_mode') {
            const io = (global as any).io;
            io.emit('maintenance_mode', { enabled: value === 'true' || value === true });
        }

        return res.json({ setting: updated });
    } catch (error) {
        console.error('[updateSetting]', error);
        return res.status(500).json({ error: 'Failed to update setting' });
    }
};

// ─── Feature Flags ───────────────────────────────────────────────────

// GET /admin/settings/flags
export const getFeatureFlags = async (_req: Request, res: Response) => {
    try {
        const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
        return res.json({ flags });
    } catch (error) {
        console.error('[getFeatureFlags]', error);
        return res.status(500).json({ error: 'Failed to fetch feature flags' });
    }
};

// PUT /admin/settings/flags/:key
export const updateFeatureFlag = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { enabled } = req.body;
        const adminId = (req as any).user?.id;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled must be a boolean' });
        }

        const flag = await prisma.featureFlag.findUnique({ where: { key } });
        if (!flag) return res.status(404).json({ error: `Feature flag '${key}' not found` });

        const updated = await prisma.featureFlag.update({
            where: { key },
            data: { enabled, updatedBy: adminId },
        });
        return res.json({ flag: updated });
    } catch (error) {
        console.error('[updateFeatureFlag]', error);
        return res.status(500).json({ error: 'Failed to update feature flag' });
    }
};

// ─── Subscription Plan Config ────────────────────────────────────────

// GET /admin/settings/plans
export const getSubscriptionPlans = async (_req: Request, res: Response) => {
    try {
        const plans = await prisma.subscriptionPlanConfig.findMany({
            orderBy: { plan: 'asc' },
        });
        return res.json({ plans });
    } catch (error) {
        console.error('[getSubscriptionPlans]', error);
        return res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
};

// PUT /admin/settings/plans/:plan
export const updateSubscriptionPlan = async (req: Request, res: Response) => {
    try {
        const { plan } = req.params;
        const adminId = (req as any).user?.id;
        const {
            monthlyPrice, annualPrice,
            maxLobbies, maxTournamentSize, maxTournamentsPerMonth,
            platformFeePercent,
            features,
        } = req.body;

        const existing = await prisma.subscriptionPlanConfig.findUnique({ where: { plan } });
        if (!existing) return res.status(404).json({ error: `Plan '${plan}' not found` });

        const updated = await prisma.subscriptionPlanConfig.update({
            where: { plan },
            data: {
                ...(monthlyPrice !== undefined && { monthlyPrice: parseFloat(monthlyPrice) }),
                ...(annualPrice !== undefined && { annualPrice: parseFloat(annualPrice) }),
                ...(maxLobbies !== undefined && { maxLobbies: parseInt(maxLobbies) }),
                ...(maxTournamentSize !== undefined && { maxTournamentSize: parseInt(maxTournamentSize) }),
                ...(maxTournamentsPerMonth !== undefined && { maxTournamentsPerMonth: parseInt(maxTournamentsPerMonth) }),
                ...(platformFeePercent !== undefined && { platformFeePercent: parseFloat(platformFeePercent) }),
                ...(features !== undefined && { features }),
                updatedBy: adminId,
            },
        });

        // Sync boolean features to ALL existing partners on this plan immediately
        if (features !== undefined) {
            await prisma.partnerSubscription.updateMany({
                where: { plan },
                data: { features }
            });
        }

        return res.json({ plan: updated });
    } catch (error) {
        console.error('[updateSubscriptionPlan]', error);
        return res.status(500).json({ error: 'Failed to update subscription plan' });
    }
};
