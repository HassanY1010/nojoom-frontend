import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { socketService } from '../services/socket';
import { motion } from 'framer-motion';

interface Notification {
    id: number;
    type: 'follow' | 'like' | 'comment' | 'mention';
    actor_username: string;
    actor_avatar: string;
    message: string;
    target_id: number;
    target_type: 'video' | 'comment' | 'user';
    is_read: boolean;
    created_at: string;
}

const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'follow' | 'like' | 'comment' | 'mention'>('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
        setupSocketListeners();
    }, [filter]);

    const setupSocketListeners = () => {
        const socket = socketService.getSocket();
        if (socket) {
            socket.on('new_notification', (notification: Notification) => {
                if (filter === 'all' || filter === notification.type) {
                    setNotifications(prev => [notification, ...prev]);
                }
            });
        }
    };

    const fetchNotifications = async (pageNum = 1) => {
        try {
            setLoading(true);
            const response = await api.get(`/notifications?page=${pageNum}&limit=20&type=${filter}`);

            if (pageNum === 1) {
                setNotifications(response.data.notifications);
            } else {
                setNotifications(prev => [...prev, ...response.data.notifications]);
            }

            setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const deleteNotification = async (notificationId: number) => {
        try {
            await api.delete(`/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        const icons = {
            follow: '👤',
            like: '❤️',
            comment: '💬',
            mention: '📢'
        };
        return icons[type as keyof typeof icons] || '🔔';
    };

    const getNotificationLink = (notification: Notification) => {
        if (notification.target_type === 'video') {
            return `/video/${notification.target_id}`;
        } else if (notification.target_type === 'user') {
            return `/profile/${notification.actor_username}`;
        }
        return '/notifications';
    };

    const formatTime = (timestamp: string) => {
        const now = new Date();
        const notifTime = new Date(timestamp);
        const diffMs = now.getTime() - notifTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return notifTime.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen bg-black text-white pt-16">
            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold">Notifications</h1>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-blue-400 text-sm hover:text-blue-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                        {(['all', 'follow', 'like', 'comment', 'mention'] as const).map((filterType) => (
                            <button
                                key={filterType}
                                onClick={() => {
                                    setFilter(filterType);
                                    setPage(1);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === filterType
                                        ? 'bg-white text-black'
                                        : 'bg-gray-800 text-white hover:bg-gray-700'
                                    }`}
                            >
                                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications List */}
                {loading && page === 1 ? (
                    <div className="flex justify-center py-12">
                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔔</div>
                        <h2 className="text-xl font-bold mb-2">No notifications</h2>
                        <p className="text-gray-400">
                            {filter === 'all'
                                ? "You're all caught up!"
                                : `No ${filter} notifications yet`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notification) => (
                            <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-gray-900 rounded-xl p-4 hover:bg-gray-800 transition-colors ${!notification.is_read ? 'border-l-4 border-blue-500' : ''
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    {/* Avatar */}
                                    <Link to={`/profile/${notification.actor_username}`}>
                                        <img
                                            src={
                                                notification.actor_avatar
                                                    ? `${import.meta.env.VITE_API_URL}${notification.actor_avatar}`
                                                    : '/default-avatar.png'
                                            }
                                            alt={notification.actor_username}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    </Link>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            to={getNotificationLink(notification)}
                                            onClick={() => {
                                                if (!notification.is_read) {
                                                    markAsRead(notification.id);
                                                }
                                            }}
                                            className="block"
                                        >
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="text-xl">
                                                    {getNotificationIcon(notification.type)}
                                                </span>
                                                {!notification.is_read && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                )}
                                            </div>
                                            <p className="text-white leading-snug">
                                                {notification.message}
                                            </p>
                                            <p className="text-gray-400 text-sm mt-1">
                                                {formatTime(notification.created_at)}
                                            </p>
                                        </Link>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => deleteNotification(notification.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                        aria-label="Delete notification"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Load More */}
                {hasMore && !loading && notifications.length > 0 && (
                    <div className="text-center mt-6">
                        <button
                            onClick={() => fetchNotifications(page + 1)}
                            className="bg-gray-800 text-white px-6 py-3 rounded-full hover:bg-gray-700 transition-colors"
                        >
                            Load More
                        </button>
                    </div>
                )}

                {loading && page > 1 && (
                    <div className="flex justify-center py-6">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
