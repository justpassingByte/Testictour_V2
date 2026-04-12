// sockets/notifications.ts
import { Server } from 'socket.io';

export default function registerNotificationSocket(io: Server) {
    io.on('connection', (socket) => {
        // Client emits this immediately after connecting with their role
        socket.on('join_role_room', (role: string) => {
            if (['player', 'partner', 'admin'].includes(role)) {
                socket.join(`role:${role}`);
            }
        });

        socket.on('join_user_room', (userId: string) => {
            if (userId) {
                socket.join(`user:${userId}`);
            }
        });

        // Partner clients also join their tier room for targeted notifications
        socket.on('join_tier_room', (tier: string) => {
            if (['FREE', 'PRO', 'ENTERPRISE'].includes(tier)) {
                socket.join(`tier:${tier}`);
            }
        });
    });
}
