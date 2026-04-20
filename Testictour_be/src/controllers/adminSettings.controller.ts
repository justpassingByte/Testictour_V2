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
            orderBy: { sortOrder: 'asc' },
        });
        return res.json({ plans });
    } catch (error) {
        console.error('[getSubscriptionPlans]', error);
        return res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
};

// GET /public/plans — No auth required, for pricing page
export const getPublicPlans = async (_req: Request, res: Response) => {
    try {
        const plans = await prisma.subscriptionPlanConfig.findMany({
            orderBy: { sortOrder: 'asc' },
            select: {
                plan: true,
                displayName: true,
                description: true,
                monthlyPrice: true,
                annualPrice: true,
                earlyAccessPrice: true,
                maxLobbies: true,
                maxTournamentSize: true,
                maxTournamentsPerMonth: true,
                platformFeePercent: true,
                features: true,
                sortOrder: true,
            },
        });
        return res.json({ success: true, plans });
    } catch (error) {
        console.error('[getPublicPlans]', error);
        return res.status(500).json({ error: 'Failed to fetch plans' });
    }
};

// PUT /admin/settings/plans/:plan
export const updateSubscriptionPlan = async (req: Request, res: Response) => {
    try {
        const { plan } = req.params;
        const adminId = (req as any).user?.id;
        const {
            monthlyPrice, annualPrice, earlyAccessPrice,
            maxLobbies, maxTournamentSize, maxTournamentsPerMonth,
            platformFeePercent,
            features, displayName, description, sortOrder,
        } = req.body;

        const existing = await prisma.subscriptionPlanConfig.findUnique({ where: { plan } });
        if (!existing) return res.status(404).json({ error: `Plan '${plan}' not found` });

        const updated = await prisma.subscriptionPlanConfig.update({
            where: { plan },
            data: {
                ...(monthlyPrice !== undefined && { monthlyPrice: parseFloat(monthlyPrice) }),
                ...(annualPrice !== undefined && { annualPrice: parseFloat(annualPrice) }),
                ...(earlyAccessPrice !== undefined && { earlyAccessPrice: earlyAccessPrice === null ? null : parseFloat(earlyAccessPrice) }),
                ...(maxLobbies !== undefined && { maxLobbies: parseInt(maxLobbies) }),
                ...(maxTournamentSize !== undefined && { maxTournamentSize: parseInt(maxTournamentSize) }),
                ...(maxTournamentsPerMonth !== undefined && { maxTournamentsPerMonth: parseInt(maxTournamentsPerMonth) }),
                ...(platformFeePercent !== undefined && { platformFeePercent: parseFloat(platformFeePercent) }),
                ...(features !== undefined && { features }),
                ...(displayName !== undefined && { displayName }),
                ...(description !== undefined && { description }),
                ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
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

// ─── Admin Transactions ──────────────────────────────────────────────

// GET /admin/transactions — Global transaction view
export const getAdminTransactions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const type = req.query.type as string;
        const status = req.query.status as string;
        const search = req.query.search as string;

        const where: any = {};
        if (type && type !== 'all') where.type = type;
        if (status && status !== 'all') where.status = status;
        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { refId: { contains: search, mode: 'insensitive' } },
                { user: { username: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    user: { select: { id: true, username: true, email: true, role: true } },
                    tournament: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.transaction.count({ where }),
        ]);

        // Summary stats
        const stats = await prisma.transaction.groupBy({
            by: ['type'],
            where: { status: 'success' },
            _sum: { amount: true },
            _count: true,
        });

        return res.json({
            success: true,
            data: transactions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            stats: stats.reduce((acc, s) => {
                acc[s.type] = { total: s._sum.amount || 0, count: s._count };
                return acc;
            }, {} as Record<string, any>),
        });
    } catch (error) {
        console.error('[getAdminTransactions]', error);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};
