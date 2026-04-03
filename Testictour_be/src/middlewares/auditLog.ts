import { Request, Response, NextFunction } from 'express';

/**
 * Lightweight audit logger for admin settings mutations.
 * Logs admin user ID, action, method, path, and body to server console.
 * Can be extended to write to a DB table in the future.
 */
export default function auditLog(action: string) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const adminId = (req as any).user?.id ?? 'unknown';
        const adminEmail = (req as any).user?.email ?? '';
        const { method, path, body } = req;

        // Redact sensitive fields
        const safeBody = { ...body };
        delete safeBody.password;

        console.log(`[AUDIT] ${new Date().toISOString()} | ${action} | user=${adminId} (${adminEmail}) | ${method} ${path} | body=${JSON.stringify(safeBody)}`);
        next();
    };
}
