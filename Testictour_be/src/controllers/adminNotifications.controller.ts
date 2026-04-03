import { Request, Response } from 'express';
import { prisma } from '../services/prisma';

function getSocketRoom(targetType: string): string {
    if (targetType === 'players') return 'role:player';
    if (targetType === 'partners') return 'role:partner';
    if (targetType.startsWith('tier:')) return `tier:${targetType.split(':')[1]}`;
    return 'role:all';
}

// POST /admin/notifications/send
export const sendNotification = async (req: Request, res: Response) => {
    try {
        const { title, body, targetType } = req.body;
        const adminId = (req as any).user?.id;

        if (!title || !body || !targetType) {
            return res.status(400).json({ error: 'title, body, and targetType are required' });
        }

        // Save to DB
        const record = await prisma.notification.create({
            data: { title, body, targetType, sentBy: adminId, status: 'sent' },
        });

        // Emit via Socket.io
        const io = (global as any).io;
        const room = getSocketRoom(targetType);
        const payload = { id: record.id, title, body, sentAt: record.sentAt.toISOString() };

        if (room === 'role:all') {
            io.emit('admin_notification', payload);
        } else {
            io.to(room).emit('admin_notification', payload);
        }

        return res.status(201).json({ success: true, notification: record });
    } catch (error) {
        console.error('[sendNotification]', error);
        return res.status(500).json({ error: 'Failed to send notification' });
    }
};

// GET /admin/notifications/history
export const getNotificationHistory = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                orderBy: { sentAt: 'desc' },
                skip,
                take: limit,
                include: { sender: { select: { username: true, email: true } } },
            }),
            prisma.notification.count(),
        ]);

        return res.json({ notifications, total, page, limit });
    } catch (error) {
        console.error('[getNotificationHistory]', error);
        return res.status(500).json({ error: 'Failed to fetch notification history' });
    }
};

// DELETE /admin/notifications/:id
export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.notification.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error('[deleteNotification]', error);
        return res.status(500).json({ error: 'Failed to delete notification' });
    }
};

// GET /admin/notifications/templates
export const getTemplates = async (_req: Request, res: Response) => {
    try {
        const templates = await prisma.notificationTemplate.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ templates });
    } catch (error) {
        console.error('[getTemplates]', error);
        return res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

// POST /admin/notifications/templates
export const createTemplate = async (req: Request, res: Response) => {
    try {
        const { name, title, body } = req.body;
        const adminId = (req as any).user?.id;

        if (!name || !title || !body) {
            return res.status(400).json({ error: 'name, title, and body are required' });
        }

        const template = await prisma.notificationTemplate.create({
            data: { name, title, body, createdBy: adminId },
        });
        return res.status(201).json({ template });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'A template with that name already exists' });
        }
        console.error('[createTemplate]', error);
        return res.status(500).json({ error: 'Failed to create template' });
    }
};

// DELETE /admin/notifications/templates/:id
export const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.notificationTemplate.delete({ where: { id } });
        return res.json({ success: true });
    } catch (error) {
        console.error('[deleteTemplate]', error);
        return res.status(500).json({ error: 'Failed to delete template' });
    }
};
