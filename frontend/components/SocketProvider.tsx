'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children, role, tier }: {
    children: React.ReactNode;
    role?: string;
    tier?: string;
}) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const s = io(apiUrl, { withCredentials: true });
        socketRef.current = s;
        setSocket(s);

        s.on('connect', () => {
            if (role) s.emit('join_role_room', role);
            if (role === 'partner' && tier) s.emit('join_tier_room', tier);
        });

        return () => { s.disconnect(); };
    }, [role, tier]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
