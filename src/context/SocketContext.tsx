import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
    const socket = useContext(SocketContext);
    return socket;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        // إذا لم يكن المستخدم مسجل دخول، قطع الاتصال
        if (!user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        // الحصول على token من localStorage
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.log('No access token found');
            return;
        }

        // إنشاء اتصال socket
        const socketUrl = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}';
        console.log('🔌 Connecting to socket at:', socketUrl);

        const newSocket = io(socketUrl, {
            auth: { token: token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        // عند الاتصال بالـ socket
        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            newSocket.emit('user_online');
        });

        // عند قطع الاتصال
        newSocket.on('disconnect', (reason: string) => {
            console.log('❌ Socket disconnected:', reason);
        });

        // عند حدوث خطأ أثناء الاتصال
        newSocket.on('connect_error', (error: Error) => {
            console.error('Socket connection error:', error);
        });

        newSocket.on('error', (error: Error) => {
            console.error('Socket error:', error);
        });

        // تخزين الـ socket في الحالة
        setSocket(newSocket);

        // تنظيف عند إلغاء التحميل أو تغيّر المستخدم
        return () => {
            if (newSocket) {
                newSocket.emit('user_away');
                newSocket.disconnect();
            }
        };
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;