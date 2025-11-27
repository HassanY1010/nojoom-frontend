import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socket';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: number;
  sender_id: number;
  video_id: number;
  content: string;
  type: 'user' | 'admin' | 'broadcast';
  created_at: string;
  username?: string;
  avatar?: string;
  display_count?: number;
  timestamp?: number;
}

interface ChatBoxProps {
  videoId: number;
  videoOwnerId: number;
  isVideoOwner: boolean;
  onClose: () => void;
  isPaused?: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ 
  videoId, 
  videoOwnerId, 
  isVideoOwner, 
  onClose,
  isPaused = false 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isChatPaused, setIsChatPaused] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [messageDisplayCounts, setMessageDisplayCounts] = useState<{[key: number]: number}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { user } = useAuth();

  // قائمة الأموجيز المتحركة الشائعة
  const animatedEmojis = ['😂', '❤️', '🔥', '👏', '😍', '🎉', '👍', '🙏', '😢', '🤔', '👀', '💀'];

  // تحديث حالة إيقاف الدردشة
  useEffect(() => {
    setIsChatPaused(isPaused);
    
    if (isPaused) {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('chat_paused', { videoId, paused: true });
      }
    }
  }, [isPaused, videoId]);

  useEffect(() => {
    initializeSocket();
    
    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('leave_video', videoId);
        socket.off('chat_message');
        socket.off('broadcast_message');
        socket.off('user_typing');
        socket.off('user_stopped_typing');
        socket.off('chat_paused');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [videoId]);

  const initializeSocket = async () => {
    try {
      const socket = await socketService.connect();
      
      setIsConnected(true);

      // الانضمام إلى غرفة الفيديو
      socket.emit('join_video', videoId);

      // استمع للرسائل الجديدة
      socket.on('chat_message', (message: Message) => {
        if (!isChatPaused) {
          addMessageWithRotation(message);
        }
      });

      // استمع للبث المباشر
      socket.on('broadcast_message', (broadcast: Message) => {
        if (!isChatPaused) {
          addMessageWithRotation({ ...broadcast, type: 'admin' });
        }
      });

      // استمع لمؤشرات الكتابة
      socket.on('user_typing', (data: { username: string; userId: number }) => {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      });

      socket.on('user_stopped_typing', (data: { userId: number }) => {
        setTypingUsers(prev => prev.filter(username => {
          const typingUser = messages.find(msg => msg.sender_id === data.userId);
          return typingUser?.username !== username;
        }));
      });

      // استمع لإشعارات إيقاف الدردشة
      socket.on('chat_paused', (data: { videoId: number; paused: boolean }) => {
        if (data.videoId === videoId) {
          setIsChatPaused(data.paused);
        }
      });

      socket.on('connect_error', (error) => {
        setIsConnected(false);
      });

    } catch (error) {
      setIsConnected(false);
    }
  };

  // إضافة رسالة مع نظام التدوير (4 مرات ظهور)
  const addMessageWithRotation = (message: Message) => {
    const messageId = message.id || Date.now();
    
    setMessages(prev => {
      const existingMessageIndex = prev.findIndex(msg => 
        msg.id === messageId || 
        (msg.content === message.content && msg.sender_id === message.sender_id)
      );

      if (existingMessageIndex !== -1) {
        // تحديث عداد الظهور للرسالة الموجودة
        const updatedMessages = [...prev];
        const currentDisplayCount = messageDisplayCounts[messageId] || 1;
        const newDisplayCount = currentDisplayCount + 1;

        if (newDisplayCount >= 4) {
          // حذف الرسالة بعد ظهورها 4 مرات
          updatedMessages.splice(existingMessageIndex, 1);
          setMessageDisplayCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[messageId];
            return newCounts;
          });
        } else {
          // تحديث عداد الظهور
          updatedMessages[existingMessageIndex] = {
            ...updatedMessages[existingMessageIndex],
            display_count: newDisplayCount,
            timestamp: Date.now()
          };
          setMessageDisplayCounts(prev => ({
            ...prev,
            [messageId]: newDisplayCount
          }));

          // إعادة ترتيب عشوائي للرسائل
          const randomIndex = Math.floor(Math.random() * updatedMessages.length);
          const [movedMessage] = updatedMessages.splice(existingMessageIndex, 1);
          updatedMessages.splice(randomIndex, 0, movedMessage);
        }

        return updatedMessages;
      } else {
        // إضافة رسالة جديدة
        const newMessageWithData = {
          ...message,
          id: messageId,
          display_count: 1,
          timestamp: Date.now()
        };

        setMessageDisplayCounts(prev => ({
          ...prev,
          [messageId]: 1
        }));

        // إضافة الرسالة في موضع عشوائي
        const randomIndex = Math.floor(Math.random() * (prev.length + 1));
        const newMessages = [...prev];
        newMessages.splice(randomIndex, 0, newMessageWithData);

        // الحفاظ على حد أقصى للرسائل
        return newMessages.slice(-100);
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() === '' || !isConnected || isChatPaused) return;

    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('chat_message', {
          videoId,
          content: newMessage.trim()
        });
        setNewMessage('');
        setShowEmojiPicker(false);
        
        // إيقاف مؤشر الكتابة
        socket.emit('typing_stop', { videoId });
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    if (!isConnected || isChatPaused) return;
    
    const socket = socketService.getSocket();
    if (socket && newMessage.trim()) {
      socket.emit('typing_start', { videoId });
      
      // إلغاء المؤقت السابق
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // إعداد مؤقت لإيقاف مؤشر الكتابة
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { videoId });
      }, 3000);
    }
  };

  const addEmoji = (emoji: string) => {
    if (!isChatPaused) {
      setNewMessage(prev => prev + emoji);
      setShowEmojiPicker(false);
      handleTyping();
    }
  };

  // دالة لعرض الرسائل بشكل عشوائي في الشريطين
  const getMessageStyle = (message: Message, index: number) => {
    const isLeft = Math.random() > 0.5;
    
    if (message.type === 'admin') {
      return 'bg-yellow-500/20 border border-yellow-500/30 mx-auto max-w-xs text-yellow-300';
    }
    
    if (message.sender_id === user?.id) {
      return 'bg-blue-500/30 border border-blue-500/50 ml-auto mr-2 max-w-xs text-white';
    }
    
    return isLeft 
      ? 'bg-green-500/20 border border-green-500/30 mr-auto ml-2 max-w-xs text-gray-100'
      : 'bg-purple-500/20 border border-purple-500/30 ml-auto mr-2 max-w-xs text-gray-100';
  };

  // دالة لعرض الأموجيز المتحركة
  const renderAnimatedEmojis = (text: string) => {
    const words = text.split(' ');
    return words.map((word, index) => {
      const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu;
      if (word.match(emojiRegex)) {
        return (
          <span 
            key={index} 
            className="inline-block animate-bounce mx-0.5 text-base sm:text-lg"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {word}
          </span>
        );
      }
      return <span key={index}>{word} </span>;
    });
  };

  // تنظيف الرسائل القديمة تلقائياً
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setMessages(prev => 
        prev.filter(message => 
          message.timestamp && (now - message.timestamp) < 5 * 60 * 1000 // 5 دقائق
        )
      );
    }, 30000); // كل 30 ثانية

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-black/90 backdrop-blur-sm">
      {/* Header مع حالة الدردشة */}
      <div className="border-b border-gray-700 p-2 sm:p-3 flex justify-between items-center bg-black/50">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <h3 className="text-white font-bold text-base sm:text-lg">Live Chat</h3>
          <div className="flex items-center space-x-1">
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? `${messages.length} active` : 'Offline'}
            </span>
          </div>
          {isChatPaused && (
            <span className="bg-red-500 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full animate-pulse">
              ⏸️ Paused
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-base sm:text-lg transition-colors bg-black/30 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* منطقة الشريطين الثابتين للرسائل */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 sm:space-y-2 chat-messages">
        {isChatPaused && (
          <div className="text-center bg-red-500/20 border border-red-500/50 rounded-lg p-2 sm:p-3 mb-2 sm:mb-4">
            <p className="text-red-300 text-xs sm:text-sm">
              ⏸️ Chat is temporarily paused due to extended viewing time. 
              It will resume after refreshing the video.
            </p>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-4 sm:mt-8">
            <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">💬</div>
            <p className="text-xs sm:text-sm">No messages yet</p>
            <p className="text-xs mt-0.5 sm:mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.id}-${index}-${message.display_count}`}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm backdrop-blur-sm transition-all duration-300 ${getMessageStyle(message, index)}`}
            >
              <div className="flex items-start space-x-1 sm:space-x-2">
                {message.type === 'user' && message.avatar && (
                  <img 
                    src={message.avatar} 
                    alt={message.username}
                    className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    {message.type === 'user' && (
                      <span className="font-bold text-white text-xs">
                        {message.username}
                        {message.sender_id === videoOwnerId && (
                          <span className="ml-0.5 sm:ml-1 text-yellow-400">🎬</span>
                        )}
                      </span>
                    )}
                    {message.type === 'admin' && (
                      <span className="font-bold text-yellow-400 text-xs flex items-center">
                        📢 {message.username}
                      </span>
                    )}
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="text-gray-400 text-xs">
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {message.display_count && message.display_count > 1 && (
                        <span className="text-gray-400 text-xs bg-black/30 px-1 rounded">
                          {message.display_count}/4
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-white text-xs sm:text-sm break-words leading-relaxed">
                    {renderAnimatedEmojis(message.content)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {/* مؤشر الكتابة */}
        {typingUsers.length > 0 && (
          <div className="text-center text-gray-400 text-xs italic mt-1 sm:mt-2 animate-pulse">
            {typingUsers.slice(0, 2).join(', ')}
            {typingUsers.length > 2 && ` and ${typingUsers.length - 2} more`} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* منتقي الإيموجي المتحرك */}
      {showEmojiPicker && !isChatPaused && (
        <div className="border-t border-gray-700 p-2 sm:p-3 bg-gray-800/90 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-1 sm:mb-2">
            <span className="text-white text-xs sm:text-sm font-medium">Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-0.5 sm:gap-1">
            {animatedEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => addEmoji(emoji)}
                className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-gray-700 rounded text-base sm:text-lg transition-all duration-200 hover:scale-110 animate-pulse"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* إدخال الرسالة */}
      <form onSubmit={sendMessage} className="p-2 sm:p-3 border-t border-gray-700 bg-black/50">
        <div className="flex space-x-1 sm:space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                if (!isChatPaused) {
                  setNewMessage(e.target.value);
                  handleTyping();
                }
              }}
              onBlur={() => {
                const socket = socketService.getSocket();
                if (socket) {
                  socket.emit('typing_stop', { videoId });
                }
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
              }}
              placeholder={
                isChatPaused 
                  ? "Chat paused - refresh video to continue..." 
                  : isConnected 
                    ? "Type your message..." 
                    : "Connecting to chat..."
              }
              disabled={!isConnected || isChatPaused}
              className="w-full bg-gray-800 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 text-xs sm:text-sm disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 pr-10 sm:pr-12 transition-all duration-200"
              maxLength={200}
            />
            {!isChatPaused && (
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white text-base sm:text-lg transition-colors"
              >
                😊
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!isConnected || newMessage.trim() === '' || isChatPaused}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-full hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm font-bold shadow-lg disabled:shadow-none min-w-12 sm:min-w-16 flex items-center justify-center"
          >
            <span className="hidden xs:inline">Send</span>
            <span className="xs:hidden">➤</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-1 sm:mt-2">
          <div className="text-xs text-gray-400">
            {newMessage.length}/200
          </div>
          {isVideoOwner && (
            <div className="text-xs text-green-400 flex items-center">
              <span className="hidden sm:inline">🎬 Video Owner</span>
              <span className="sm:hidden">🎬 Owner</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatBox;