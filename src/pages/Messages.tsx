import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from "../context/AuthContext";
import { useSocket } from '../context/SocketContext';
import { messagesApi, userApi } from '../services/api';

interface User {
    id: number;
    username: string;
    avatar: string;
    is_online: boolean;
    bio?: string;
}

interface Conversation {
    id: number;
    username: string;
    avatar: string;
    is_online: boolean;
    last_message_content: string;
    last_message: string;
    last_message_at: string;
    last_message_time: string;
    last_message_sender_id: number;
    unread_count: number;
    other_user_id: number;
}

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
    sender_username: string;
    sender_avatar: string;
    receiver_username: string;
    receiver_avatar: string;
}

const Messages: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const socket = useSocket();

    const [activeTab, setActiveTab] = useState<'conversations' | 'search'>('conversations');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'incoming' | 'sent'>('all');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👋', '🔥', '🎉', '✨', '🤔', '👀', '🤝', '✅', '❌', '😊', '😎', '🙌', '💪', '🌹'];

    // تصفية المحادثات
    const filteredConversations = conversations.filter(conv => {
        if (filter === 'all') return true;
        if (filter === 'incoming') return conv.last_message_sender_id === conv.other_user_id;
        if (filter === 'sent') return conv.last_message_sender_id === user?.id;
        return true;
    });

    // تحميل المحادثات
    const loadConversations = async () => {
        try {
            setLoading(true);
            const response = await messagesApi.getConversations();
            setConversations(response.data.data || []);

            // تحميل عدد الرسائل غير المقروءة
            const unreadResponse = await messagesApi.getUnreadCount();
            setUnreadCount(unreadResponse.data.data?.unread_count || 0);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    // تحميل محادثة محددة
    const loadConversation = async (conversation: Conversation) => {
        try {
            setSelectedConversation(conversation);
            const response = await messagesApi.getConversation(conversation.other_user_id);
            setMessages(response.data.data?.messages || []);

            // تحديد الرسائل كمقروءة
            await messagesApi.markAsRead(conversation.other_user_id);

            // إعادة تحميل المحادثات لتحديث العدد غير المقروء
            loadConversations();
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    };

    // إرسال رسالة جديدة
    const sendMessage = async () => {
        const messageContent = newMessage.trim() || messageInput.trim();
        if (!messageContent || !selectedConversation) return;

        try {
            // استخدام Socket إذا كان متاحاً
            if (socket) {
                socket.emit('private_message', {
                    receiver_id: selectedConversation.other_user_id,
                    content: messageContent
                });
            } else {
                // استخدام API كبديل
                const response = await messagesApi.sendMessage(
                    selectedConversation.other_user_id,
                    messageContent
                );

                // إضافة الرسالة الجديدة للقائمة
                if (response.data.data) {
                    setMessages(prev => [...prev, response.data.data]);
                }
            }

            setNewMessage('');
            setMessageInput('');
            stopTyping();

            // إعادة تحميل المحادثات لتحديث آخر رسالة
            loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            alert(t('sendMessageError') || 'فشل إرسال الرسالة');
        }
    };

    // البحث عن مستخدمين
    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await userApi.searchUsers(query);
            setSearchResults(response.data.users || []);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    // بدء محادثة جديدة
    const startNewConversation = async (userData: User) => {
        const newConversation: Conversation = {
            id: Date.now(), // مؤقت
            username: userData.username,
            avatar: userData.avatar,
            is_online: userData.is_online,
            last_message_content: '',
            last_message: '',
            last_message_at: new Date().toISOString(),
            last_message_time: new Date().toISOString(),
            last_message_sender_id: 0,
            unread_count: 0,
            other_user_id: userData.id
        };

        setSelectedConversation(newConversation);
        setMessages([]);
        setSearchQuery('');
        setSearchResults([]);
        setActiveTab('conversations');
    };

    // إدارة الكتابة
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);
        setMessageInput(value);

        if (!socket || !selectedConversation) return;

        // إرسال مؤشر الكتابة
        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing_private', {
                receiver_id: selectedConversation.other_user_id,
                isTyping: true
            });
        }

        // إيقاف مؤشر الكتابة بعد 2 ثانية من عدم الكتابة
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 2000);
    };

    const stopTyping = () => {
        if (isTyping && socket && selectedConversation) {
            setIsTyping(false);
            socket.emit('typing_private', {
                receiver_id: selectedConversation.other_user_id,
                isTyping: false
            });
        }
    };

    // إضافة إيموجي
    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setMessageInput(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    // التمرير للأسفل تلقائياً
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // تنسيق الوقت
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) {
            const minutes = Math.floor(diff / (1000 * 60));
            return minutes < 1 ? 'الآن' : `${minutes}د`;
        } else if (hours < 24) {
            return `${hours}س`;
        } else {
            const days = Math.floor(hours / 24);
            return `${days}ي`;
        }
    };

    // تجميع الرسائل حسب التاريخ
    const groupMessagesByDate = (msgs: Message[]) => {
        const groups: { [key: string]: Message[] } = {};
        msgs.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(msg);
        });
        return groups;
    };

    const getDateLabel = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return t('today') || 'اليوم';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return t('yesterday') || 'أمس';
        } else {
            return date.toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    // الاستماع لأحداث Socket
    useEffect(() => {
        if (!socket) return;

        // استقبال رسالة جديدة
        socket.on('private_message_received', (message: Message) => {
            if (selectedConversation && message.sender_id === selectedConversation.other_user_id) {
                setMessages(prev => [...prev, message]);
                scrollToBottom();

                // وضع علامة مقروء
                socket.emit('mark_messages_read', {
                    sender_id: message.sender_id
                });
            } else {
                // تحديث قائمة المحادثات
                loadConversations();
                setUnreadCount(prev => prev + 1);
            }
        });

        // تأكيد إرسال الرسالة
        socket.on('private_message_sent', (message: Message) => {
            setMessages(prev => [...prev, message]);
            scrollToBottom();
            loadConversations();
        });

        // مؤشر الكتابة
        socket.on('user_typing_private', (data: {
            sender_id: number;
            username: string;
            isTyping: boolean
        }) => {
            if (selectedConversation && data.sender_id === selectedConversation.other_user_id) {
                setTypingUser(data.isTyping ? data.username : null);
            }
        });

        // تحديث حالة القراءة
        socket.on('messages_read', () => {
            setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })));
        });

        return () => {
            socket.off('private_message_received');
            socket.off('private_message_sent');
            socket.off('user_typing_private');
            socket.off('messages_read');
        };
    }, [socket, selectedConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const timeoutId = setTimeout(() => searchUsers(searchQuery), 500);
            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery]);

    if (!user) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-xl font-semibold mb-2">
                        {t('loginRequired') || 'يجب تسجيل الدخول'}
                    </h2>
                    <p className="text-gray-400">
                        {t('loginToUseMessages') || 'سجل الدخول لاستخدام الرسائل'}
                    </p>
                </div>
            </div>
        );
    }

    if (loading && conversations.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white pt-20 px-4">
                <div className="max-w-6xl mx-auto flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-gray-400">
                            {t('loading') || 'جاري التحميل...'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className="min-h-screen bg-black text-white pt-16 pb-20 lg:pb-4">
            <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex gap-4 px-4">

                {/* الشريط الجانبي للمحادثات */}
                <div className={`w-full lg:w-96 bg-gray-900 rounded-2xl flex flex-col overflow-hidden ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>

                    {/* رأس الشريط الجانبي */}
                    <div className="p-4 border-b border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold">
                                💬 {t('messages') || 'الرسائل'}
                            </h1>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>

                        {/* أزرار التبويب */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveTab('conversations')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === 'conversations'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                المحادثات
                            </button>
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === 'search'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                البحث
                            </button>
                        </div>

                        {/* شريط البحث */}
                        {activeTab === 'search' && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('searchUsers') || 'ابحث عن مستخدمين...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
                                />
                            </div>
                        )}

                        {/* أزرار التصفية */}
                        {activeTab === 'conversations' && (
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`flex-1 py-1 px-2 rounded text-sm transition-colors ${filter === 'all'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    الكل
                                </button>
                                <button
                                    onClick={() => setFilter('incoming')}
                                    className={`flex-1 py-1 px-2 rounded text-sm transition-colors ${filter === 'incoming'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    واردة
                                </button>
                                <button
                                    onClick={() => setFilter('sent')}
                                    className={`flex-1 py-1 px-2 rounded text-sm transition-colors ${filter === 'sent'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }`}
                                >
                                    مرسلة
                                </button>
                            </div>
                        )}
                    </div>

                    {/* قائمة المحادثات أو نتائج البحث */}
                    <div className="flex-1 overflow-y-auto p-2">
                        <AnimatePresence>
                            {activeTab === 'conversations' ? (
                                <div className="space-y-2">
                                    {filteredConversations.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-8 text-gray-500"
                                        >
                                            <div className="text-4xl mb-2">💬</div>
                                            <p>{t('noConversations') || 'لا توجد محادثات بعد'}</p>
                                        </motion.div>
                                    ) : (
                                        filteredConversations.map((conversation) => (
                                            <motion.div
                                                key={conversation.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                onClick={() => loadConversation(conversation)}
                                                className={`p-3 rounded-xl cursor-pointer transition-all ${selectedConversation?.other_user_id === conversation.other_user_id
                                                        ? 'bg-purple-600'
                                                        : 'bg-gray-800 hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img
                                                            src={conversation.avatar}
                                                            alt={conversation.username}
                                                            className="w-12 h-12 rounded-full object-cover"
                                                        />
                                                        {conversation.is_online && (
                                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-right">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className="font-semibold truncate">
                                                                {conversation.username}
                                                            </h3>
                                                            <span className="text-xs text-gray-500">
                                                                {formatTime(conversation.last_message_at)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-sm text-gray-300 truncate max-w-[70%]">
                                                                {conversation.last_message_sender_id === user.id && 'أنت: '}
                                                                {conversation.last_message_content || conversation.last_message}
                                                            </p>
                                                            {conversation.unread_count > 0 && (
                                                                <span className="bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                                                    {conversation.unread_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {searchResults.map((user) => (
                                        <motion.div
                                            key={user.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => startNewConversation(user)}
                                            className="p-3 rounded-xl cursor-pointer bg-gray-800 hover:bg-gray-700 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.username}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                    {user.is_online && (
                                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <h3 className="font-semibold">{user.username}</h3>
                                                    <p className="text-sm text-gray-300">{user.bio}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* منطقة المحادثة الرئيسية */}
                <div className={`flex-1 bg-gray-900 rounded-2xl flex-col overflow-hidden ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
                    {selectedConversation ? (
                        <>
                            {/* رأس المحادثة */}
                            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="lg:hidden p-2 hover:bg-gray-800 rounded-full transition-colors"
                                >
                                    ←
                                </button>
                                <div className="relative">
                                    <img
                                        src={selectedConversation.avatar}
                                        alt={selectedConversation.username}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    {selectedConversation.is_online && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-lg">{selectedConversation.username}</h2>
                                    <p className="text-sm text-green-400">
                                        {typingUser === selectedConversation.username
                                            ? 'يكتب الآن...'
                                            : selectedConversation.is_online ? 'متصل الآن' : 'غير متصل'}
                                    </p>
                                </div>
                            </div>

                            {/* منطقة الرسائل */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {Object.keys(messageGroups).length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="text-4xl mb-2">💭</div>
                                        <p>{t('noMessagesInConversation') || 'لا توجد رسائل في هذه المحادثة بعد'}</p>
                                        <p className="text-sm mt-2">ابدأ المحادثة بإرسال رسالة!</p>
                                    </div>
                                ) : (
                                    Object.keys(messageGroups).map(date => (
                                        <div key={date}>
                                            {/* فاصل التاريخ */}
                                            <div className="flex justify-center mb-4">
                                                <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                                                    {getDateLabel(date)}
                                                </span>
                                            </div>

                                            {/* رسائل هذا التاريخ */}
                                            {messageGroups[date].map((message) => (
                                                <motion.div
                                                    key={message.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'} mb-2`}
                                                >
                                                    <div
                                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${message.sender_id === user.id
                                                                ? 'bg-purple-600 text-white rounded-br-none'
                                                                : 'bg-gray-800 text-white rounded-bl-none'
                                                            }`}
                                                    >
                                                        <p className="text-sm break-words">{message.content}</p>
                                                        <div className={`flex items-center gap-1 mt-1 text-xs ${message.sender_id === user.id ? 'text-purple-200' : 'text-gray-400'
                                                            }`}>
                                                            <span>
                                                                {new Date(message.created_at).toLocaleTimeString('ar-EG', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                            {message.sender_id === user.id && (
                                                                <span>
                                                                    {message.is_read ? '✓✓' : '✓'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* منطقة إرسال الرسالة */}
                            <div className="p-4 border-t border-gray-800">
                                <div className="flex items-center gap-2 relative">
                                    {/* منتقي الإيموجي */}
                                    <button
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                                    >
                                        😊
                                    </button>

                                    <AnimatePresence>
                                        {showEmojiPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute bottom-14 right-0 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-xl grid grid-cols-5 gap-1 w-64 z-50"
                                            >
                                                {COMMON_EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => addEmoji(emoji)}
                                                        className="text-2xl p-2 hover:bg-gray-700 rounded transition-colors"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <input
                                        type="text"
                                        value={newMessage || messageInput}
                                        onChange={handleTyping}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder={t('typeMessage') || 'اكتب رسالتك هنا...'}
                                        className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
                                        maxLength={1000}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim() && !messageInput.trim()}
                                        className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {t('send') || 'إرسال'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <span className="text-4xl">💬</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                {t('privateMessages') || 'الرسائل الخاصة'}
                            </h2>
                            <p>
                                {t('selectConversationToStart') || 'اختر محادثة للبدء أو ابحث عن مستخدم جديد'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;