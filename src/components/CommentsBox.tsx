import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { commentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';

interface Comment {
  id: number;
  video_id: number;
  user_id: number;
  username: string;
  avatar: string;
  content: string;
  created_at: string;
  is_owner?: boolean;
}

interface CommentsBoxProps {
  videoId: number;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

const CommentsBox: React.FC<CommentsBoxProps> = ({ 
  videoId, 
  isOpen, 
  onClose,
  onCommentAdded,
  onCommentDeleted 
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && videoId) {
      loadComments();
      setupSocketListeners();
      // ✅ التركيز على حقل الإدخال عند فتح الصندوق
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
    
    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('new_comment');
        socket.off('comment_deleted');
      }
    };
  }, [isOpen, videoId]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const setupSocketListeners = () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on('new_comment', (comment: Comment) => {
      if (comment.video_id === videoId) {
        setComments(prev => {
          // ✅ إضافة التعليق الجديد في البداية (المقدمة)
          const updatedComments = [comment, ...prev];
          // ✅ تجنب التكرار
          return updatedComments.filter((c, index, self) => 
            index === self.findIndex((t) => t.id === c.id)
          );
        });
        onCommentAdded?.();
      }
    });

    socket.on('comment_deleted', (data: { commentId: number, videoId: number }) => {
      if (data.videoId === videoId) {
        setComments(prev => prev.filter(comment => comment.id !== data.commentId));
        onCommentDeleted?.();
      }
    });
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await commentApi.getComments(videoId);
      // ✅ عكس الترتيب لعرض الجديد أولاً
      const reversedComments = (response.data.comments || []).reverse();
      setComments(reversedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user) return;

    try {
      setSending(true);
      const response = await commentApi.postComment(videoId, newComment.trim());
      
      onCommentAdded?.();
      
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('new_comment', {
          videoId,
          comment: response.data.comment
        });
      }

      // ✅ إضافة التعليق فوراً في الواجهة (في المقدمة)
      const newCommentObj: Comment = {
        ...response.data.comment,
        username: user.username,
        avatar: user.avatar,
        is_owner: true
      };
      
      setComments(prev => [newCommentObj, ...prev]);
      
      // ✅ مسح الحقل فقط (لا يتم إخفاؤه)
      setNewComment('');
      
      // ✅ إعادة التركيز على حقل الإدخال بعد الإرسال
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      console.log('✅ Comment added successfully');
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentApi.deleteComment(commentId);
      onCommentDeleted?.();
      
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('delete_comment', {
          commentId,
          videoId
        });
      }
      
      // ✅ تحديث الواجهة فوراً
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      console.log('🗑️ Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const handleEditComment = async (commentId: number, newContent: string) => {
    try {
      await commentApi.updateComment(commentId, newContent);
      
      // ✅ تحديث التعليق في الواجهة
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, content: newContent }
          : comment
      ));
      
      console.log('✏️ Comment updated successfully');
    } catch (error) {
      console.error('Failed to edit comment:', error);
      alert('Failed to edit comment. Please try again.');
    }
  };

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    
    return date.toLocaleDateString('ar-SA');
  };

  // ✅ حالة التعديل
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const saveEdit = async (commentId: number) => {
    if (!editContent.trim()) return;
    
    await handleEditComment(commentId, editContent.trim());
    setEditingCommentId(null);
    setEditContent('');
  };

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(e.target.value);
    
    const socket = socketService.getSocket();
    if (socket && user) {
      socket.emit('typing_comment', { videoId, isTyping: true });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_comment', { videoId, isTyping: false });
        setIsTyping(false);
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md h-[90vh] sm:h-96 flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
                التعليقات ({comments.length})
              </h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="text-3xl sm:text-4xl mb-2">💬</div>
                  <p className="text-sm sm:text-base">لا توجد تعليقات بعد</p>
                  <p className="text-xs sm:text-sm">كن أول من يعلق!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 rtl:space-x-reverse">
                    <div className="flex-shrink-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {comment.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-2 sm:p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-xs sm:text-sm text-gray-800 dark:text-white">
                            {comment.username}
                            {comment.user_id === user?.id && (
                              <span className="text-xs text-blue-500 mr-1 sm:mr-2">(أنت)</span>
                            )}
                          </span>
                          <div className="flex items-center space-x-1 sm:space-x-2 rtl:space-x-reverse">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(comment.created_at)}
                            </span>
                            {/* ✅ أزرار التحكم للمالك فقط */}
                            {user && comment.user_id === user.id && (
                              <div className="flex space-x-1 rtl:space-x-reverse">
                                {editingCommentId === comment.id ? (
                                  <>
                                    <button
                                      onClick={() => saveEdit(comment.id)}
                                      className="text-xs text-green-500 hover:text-green-700 transition-colors"
                                      title="حفظ"
                                    >
                                      💾
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                      title="إلغاء"
                                    >
                                      ❌
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditing(comment)}
                                      className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                                      title="تعديل"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                      title="حذف"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* ✅ عرض محتوى التعليق أو حقل التعديل */}
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-900 dark:text-white dark:bg-gray-700"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm break-words">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* ✅ Comment Input - يظل ظاهراً دائماً */}
            {user && (
              <form onSubmit={handleSubmitComment} className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newComment}
                    onChange={handleInputChange}
                    placeholder="اكتب تعليقك..."
                    className="flex-1 px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || sending}
                    className="px-3 py-2 text-xs sm:text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? (
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'إرسال'
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-center">
                  {newComment.length}/500
                </div>
              </form>
            )}

            {!user && (
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  يرجى تسجيل الدخول لإضافة تعليق
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommentsBox;