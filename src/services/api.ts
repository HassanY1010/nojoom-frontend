import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // ✅ زيادة المهلة لرفع الفيديوهات
  withCredentials: true // ✅ إضافة هذا الخيار لدعم CORS
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // ✅ إضافة هيدرات إضافية لتحسين CORS
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ✅ منع إعادة المحاولة لطلبات تسجيل الدخول والتسجيل
    const isAuthRequest = originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/register');

    if (isAuthRequest) {
      return Promise.reject(error);
    }

    // ✅ إذا كان الخطأ 401 ولم يتم إعادة المحاولة بعد
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.log('❌ No refresh token available for refresh');
          throw new Error('No refresh token available');
        }

        console.log('🔄 Attempting token refresh...');

        // ✅ استخدام axios مباشرة لتجنب التداخل مع interceptors
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        console.log('✅ Token refreshed successfully');

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);

        // Clear all auth data and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userPreferences');

        // ✅ إعادة توجيه لل login فقط إذا لم نكن في صفحة login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        return Promise.reject(new Error('Authentication failed. Please login again.'));
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      console.error('❌ Access forbidden:', error.response.data);
    } else if (error.response?.status === 404) {
      console.error('❌ Resource not found:', error.response.config.url);
    } else if (error.response?.status >= 500) {
      console.error('❌ Server error:', error.response.data);
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('❌ Network error - check CORS and server connectivity');
    }

    return Promise.reject(error);
  }
);

// Messages API endpoints - محدثة بالكامل
export const messagesApi = {
  // إرسال رسالة
  sendMessage: (receiverId: number, content: string) =>
    api.post('/messages/send', { receiver_id: receiverId, content }),

  // الحصول على محادثة
  getConversation: (userId: number, page?: number, limit?: number) =>
    api.get(`/messages/conversation/${userId}`, { params: { page, limit } }),

  // الحصول على قائمة المحادثات
  getConversations: () => api.get('/messages/conversations'),

  // الحصول على عدد الرسائل غير المقروءة
  getUnreadCount: () => api.get('/messages/unread-count'),

  // تحديد رسائل كمقروءة
  markAsRead: (userId: number) => api.post(`/messages/mark-read/${userId}`),

  // البحث في الرسائل
  searchMessages: (query: string) => api.get('/messages/search', { params: { q: query } }),

  // حذف محادثة
  deleteConversation: (userId: number) => api.delete(`/messages/conversation/${userId}`),

  // الحصول على إحصائيات الرسائل
  getMessageStats: () => api.get('/messages/stats')
};

// Explore API endpoints - ✅ إضافة واجهات برمجة للـ Explore
export const exploreApi = {
  // جلب فيديوهات الـ Explore
  getExploreVideos: (params: {
    page?: number;
    limit?: number;
    filter?: 'recommended' | 'trending' | 'popular' | 'latest';
    search?: string;
    hashtag?: string;
    userId?: number;
  }) => api.get('/explore/videos', { params }),

  // جبل مستخدمي الـ Explore
  getExploreUsers: (params: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: number;
  }) => api.get('/explore/users', { params }),

  // البحث الشامل في الـ Explore
  searchExplore: (query: string, limit?: number) =>
    api.get('/explore/search', { params: { q: query, limit } }),

  // جلب الهاشتاجات الشائعة
  getTrendingHashtags: (limit?: number) =>
    api.get('/explore/hashtags/trending', { params: { limit } }),

  // جلب إحصائيات الـ Explore
  getExploreStats: () => api.get('/explore/stats'),

  // تسجيل مشاهدة في الـ Explore
  recordExploreView: (videoId: number, source: string = 'explore') =>
    api.post('/explore/view', { videoId, source })
};

// Recommendation API endpoints
export const recommendationApi = {
  // الحصول على الفيديوهات المقترحة
  getRecommendedVideos: (limit?: number) =>
    api.get('/videos/recommended', { params: { limit } }),

  // الحصول على فيديوهات المتابَعين
  getFollowingVideos: (limit?: number) =>
    api.get('/videos/following', { params: { limit } }),

  // تسجيل تفاعل المستخدم
  recordInteraction: (data: {
    videoId: number;
    type: 'like' | 'share' | 'watch' | 'comment' | 'report' | 'follow' | 'unfollow';
    weight?: number;
    metadata?: any;
  }) => api.post('/user/interaction', data),

  // تسجيل سجل المشاهدة
  recordWatchHistory: (data: {
    videoId: number;
    watchTime: number;
    completed: boolean;
    timestamp?: string;
  }) => api.post('/user/watch-history', data),

  // الحصول على التفضيلات
  getUserPreferences: () => api.get('/user/preferences'),

  // تحديث التفضيلات
  updateUserPreferences: (preferences: any) =>
    api.put('/user/preferences', preferences),

  // الحصول على إحصائيات التوصية
  getRecommendationStats: () => api.get('/user/recommendation-stats'),

  // الحصول على سجل المشاهدة
  getWatchHistory: (limit?: number) =>
    api.get('/user/watch-history', { params: { limit } })
};

// ✅ Comment API endpoints - واجهات برمجة جديدة للتعليقات
export const commentApi = {
  // الحصول على تعليقات الفيديو
  getComments: (videoId: number) =>
    api.get(`/videos/${videoId}/comments`),

  // إضافة تعليق جديد
  postComment: (videoId: number, content: string) =>
    api.post(`/videos/${videoId}/comments`, { content }),

  // حذف تعليق
  deleteComment: (commentId: number) =>
    api.delete(`/comments/${commentId}`),

  // ✅ تحديث تعليق
  updateComment: (commentId: number, content: string) =>
    api.put(`/comments/${commentId}`, { content }),

  // الإبلاغ عن تعليق
  reportComment: (commentId: number, reason: string) =>
    api.post(`/comments/${commentId}/report`, { reason })
};

// Video API endpoints - ✅ تحديث شامل مع إضافة المشاركات
export const videoApi = {
  // الحصول على الفيديوهات
  getVideos: (page?: number, limit?: number) =>
    api.get('/videos', { params: { page, limit } }),

  // الحصول على فيديو محدد
  getVideo: (id: number) => api.get(`/videos/${id}`),

  // رفع فيديو - ✅ تحسين رفع الفيديوهات
  uploadVideo: (formData: FormData) =>
    api.post('/videos/upload', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 120000, // 2 دقائق لرفع الفيديو
      withCredentials: true
    }),

  // حذف فيديو
  deleteVideo: (id: number) => api.delete(`/videos/${id}`),

  // إعجاب بفيديو
  likeVideo: (videoId: number) => api.post(`/videos/${videoId}/like`),

  // إلغاء إعجاب
  unlikeVideo: (videoId: number) => api.delete(`/videos/${videoId}/like`),

  // ✅ جديد: تسجيل مشاركة الفيديو
  shareVideo: (videoId: number, shareMethod?: string) =>
    api.post(`/videos/${videoId}/share`, { shareMethod }),

  // ✅ جديد: الحصول على عدد المشاركات
  getShareCount: (videoId: number) =>
    api.get(`/videos/${videoId}/shares/count`),

  // الحصول على الفيديوهات المعجبة بها
  getLikedVideos: () => api.get('/videos/user/liked'),

  // البحث عن فيديوهات
  searchVideos: (query: string, limit?: number) =>
    api.get('/videos/search/all', { params: { q: query, limit } }),

  // الفيديوهات الشائعة
  getTrendingVideos: (limit?: number, days?: number) =>
    api.get('/videos/trending/all', { params: { limit, days } }),

  // ✅ جديد: الحصول على إحصائيات الفيديو
  getVideoStats: (videoId: number) =>
    api.get(`/videos/${videoId}/stats`),

  // ✅ جديد: الحصول على فيديوهات المستخدم
  getUserVideos: (userId: number, sortBy?: string) =>
    api.get(`/videos/user/${userId}`, { params: { sortBy } }),

  // ✅ جديد: تسجيل مشاهدة الفيديو
  addView: (videoId: number) => api.post(`/videos/${videoId}/view`)
};

// User API endpoints - تحديث شامل
export const userApi = {
  // الحصول على ملف مستخدم
  getProfile: (username: string) => api.get(`/user/profile/${username}`),

  // تحديث الملف الشخصي
  updateProfile: (formData: FormData) =>
    api.put('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // تحديث الروابط الاجتماعية
  updateSocialLinks: (socialLinks: string) =>
    api.put('/user/social-links', { social_links: socialLinks }),

  // البحث عن مستخدمين
  searchUsers: (query: string) =>
    api.get('/users/search', { params: { q: query } }),

  // ✅ متابعة مستخدم
  followUser: (userId: number) => api.post(`/users/follow/${userId}`),

  // ✅ إلغاء متابعة مستخدم
  unfollowUser: (userId: number) => api.delete(`/users/follow/${userId}`),

  // ✅ الحصول على المتابعين
  getFollowers: (userId?: number) =>
    userId ? api.get(`/users/${userId}/followers`) : api.get('/users/followers'),

  // ✅ الحصول على المتابَعين
  getFollowing: (userId?: number) =>
    userId ? api.get(`/users/${userId}/following`) : api.get('/users/following'),

  // ✅ الحصول على الإعجابات
  getLikes: (userId: number) => api.get(`/users/${userId}/likes`),

  // ✅ إحصائيات المستخدم
  getUserStats: () => api.get('/user/stats'),

  // ✅ حذف الحساب
  deleteAccount: (password: string) => api.post('/users/account/delete', { password }),

  // ✅ الحصول على سجل المشاهدة
  getWatchHistory: (page?: number, limit?: number) =>
    api.get('/user/watch-history', { params: { page, limit } }),

  // ✅ حذف عنصر من سجل المشاهدة
  deleteWatchHistoryItem: (videoId: number) =>
    api.delete(`/users/watch-history/${videoId}`),

  // ✅ مسح سجل المشاهدة بالكامل
  clearWatchHistory: () => api.delete('/users/watch-history'),

  // ✅ الحصول على النشاط
  getUserActivity: (page?: number, limit?: number) =>
    api.get('/users/activity', { params: { page, limit } }),

  // ✅ الحصول على الإشعارات
  getNotifications: (page?: number, limit?: number) =>
    api.get('/users/notifications', { params: { page, limit } }),

  // ✅ تحديد إشعار كمقروء
  markNotificationAsRead: (notificationId: number) =>
    api.put(`/users/notifications/${notificationId}/read`),

  // ✅ تحديد جميع الإشعارات كمقروءة
  markAllNotificationsAsRead: () =>
    api.put('/users/notifications/read-all'),

  // ✅ حذف إشعار
  deleteNotification: (notificationId: number) =>
    api.delete(`/users/notifications/${notificationId}`),

  // ✅ حظر مستخدم
  blockUser: (userId: number) => api.post(`/users/block/${userId}`),

  // ✅ إلغاء حظر مستخدم
  unblockUser: (userId: number) => api.delete(`/users/block/${userId}`),

  // ✅ الحصول على المستخدمين المحظورين
  getBlockedUsers: () => api.get('/users/blocked-users'),

  // ✅ الحصول على المستخدمين المقترحين
  getSuggestedUsers: (limit?: number) =>
    api.get('/users/suggested-users', { params: { limit } }),

  // ✅ تحديث إعدادات الإشعارات
  updateNotificationSettings: (notifications: boolean) =>
    api.put('/users/notification-settings', { notifications }),

  // ✅ تغيير كلمة المرور
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/change-password', { currentPassword, newPassword })
};

// Auth API endpoints - ✅ إضافة واجهات برمجة للمصادقة
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  getProfile: () => api.get('/auth/profile'),

  // ✅ التحقق من صحة التوكن
  verifyToken: () => api.get('/auth/verify'),

  // ✅ طلب إعادة تعيين كلمة المرور
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  // ✅ إعادة تعيين كلمة المرور
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword })
};

// OTP API endpoints - ✅ نظام OTP الكامل
export const otpApi = {
  // إرسال OTP للبريد الإلكتروني
  sendOTP: (email: string) =>
    api.post('/auth/send-otp', { email }),

  // التحقق من OTP
  verifyOTP: (email: string, code: string) =>
    api.post('/auth/verify-otp', { email, code })
};

// Password Reset API endpoints - ✅ نظام إعادة تعيين كلمة المرور
export const passwordResetApi = {
  // إرسال كود إعادة التعيين
  sendResetCode: (email: string) =>
    api.post('/reset-password/forgot', { email }),

  // التحقق من كود إعادة التعيين
  verifyResetCode: (email: string, code: string) =>
    api.post('/reset-password/verify', { email, code }),

  // إعادة تعيين كلمة المرور
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/reset-password/reset', { email, code, newPassword })
};

// Admin API endpoints - ✅ إضافة واجهات برمجة للإدارة
export const adminApi = {
  // إدارة المستخدمين
  getUsers: (page?: number, limit?: number, search?: string) =>
    api.get('/admin/users', { params: { page, limit, search } }),

  updateUser: (userId: number, userData: any) =>
    api.put(`/admin/users/${userId}`, userData),

  banUser: (userId: number, reason?: string) =>
    api.post(`/admin/users/${userId}/ban`, { reason }),

  unbanUser: (userId: number) =>
    api.post(`/admin/users/${userId}/unban`),

  deleteUser: (userId: number) =>
    api.delete(`/admin/users/${userId}`),

  // إدارة الفيديوهات
  getVideos: (page?: number, limit?: number, search?: string) =>
    api.get('/admin/videos', { params: { page, limit, search } }),

  deleteVideo: (videoId: number) =>
    api.delete(`/admin/videos/${videoId}`),

  // إدارة التقارير
  getReports: (page?: number, limit?: number, status?: string) =>
    api.get('/admin/reports', { params: { page, limit, status } }),

  updateReportStatus: (reportId: number, status: string) =>
    api.patch(`/admin/reports/${reportId}/status`, { status }),

  // الإحصائيات
  getStats: () => api.get('/admin/stats'),

  // الإعدادات
  updateSettings: (settings: any) =>
    api.put('/admin/settings', settings)
};

// Report API endpoints - ✅ إضافة واجهات برمجة للإبلاغ
export const reportApi = {
  // الإبلاغ عن فيديو
  reportVideo: (videoId: number, reason: string, category: string) =>
    api.post(`/reports/video/${videoId}`, { reason, category }),

  // الإبلاغ عن مستخدم
  reportUser: (userId: number, reason: string, category: string) =>
    api.post(`/reports/user/${userId}`, { reason, category }),

  // الإبلاغ عن تعليق
  reportComment: (commentId: number, reason: string, category: string) =>
    api.post(`/reports/comment/${commentId}`, { reason, category }),

  // الحصول على تقاريري
  getMyReports: (page?: number, limit?: number) =>
    api.get('/reports/my-reports', { params: { page, limit } })
};

// Chat/Messages API endpoints - ✅ إضافة واجهات برمجة للمحادثات
export const chatApi = {
  // الحصول على المحادثات
  getConversations: (page?: number, limit?: number) =>
    api.get('/messages/conversations', { params: { page, limit } }),

  // الحصول على رسائل محادثة
  getMessages: (userId: number, page?: number, limit?: number) =>
    api.get(`/messages/${userId}`, { params: { page, limit } }),

  // إرسال رسالة
  sendMessage: (receiverId: number, content: string) =>
    api.post('/messages/send', { receiverId, content }),

  // تحديد رسائل كمقروءة
  markAsRead: (messageId: number) =>
    api.put(`/messages/${messageId}/read`),

  // حذف محادثة
  deleteConversation: (userId: number) =>
    api.delete(`/messages/conversation/${userId}`)
};

// Share API endpoints - ✅ إضافة واجهات برمجة جديدة للمشاركات
export const shareApi = {
  // تسجيل مشاركة فيديو
  shareVideo: (videoId: number, shareMethod: string = 'direct') =>
    api.post(`/videos/${videoId}/share`, { shareMethod }),

  // الحصول على عدد المشاركات
  getShareCount: (videoId: number) =>
    api.get(`/videos/${videoId}/shares/count`),

  // الحصول على إحصائيات المشاركات
  getShareStats: (videoId: number) =>
    api.get(`/videos/${videoId}/shares/stats`),

  // الحصول على سجل المشاركات
  getShareHistory: (videoId?: number, userId?: number, limit?: number) =>
    api.get('/user/share-history', { params: { videoId, userId, limit } }),

  // الحصول على الفيديوهات الأكثر مشاركة
  getMostSharedVideos: (limit?: number, days?: number) =>
    api.get('/videos/most-shared', { params: { limit, days } })
};

// Analytics API endpoints - ✅ إضافة واجهات برمجة للإحصائيات
export const analyticsApi = {
  // إحصائيات الفيديو
  getVideoAnalytics: (videoId: number) =>
    api.get(`/analytics/videos/${videoId}`),

  // إحصائيات المستخدم
  getUserAnalytics: () =>
    api.get('/analytics/user'),

  // إحصائيات المشاركات
  getShareAnalytics: (videoId: number) =>
    api.get(`/analytics/shares/${videoId}`),

  // تقرير التفاعلات
  getEngagementReport: (startDate?: string, endDate?: string) =>
    api.get('/analytics/engagement', { params: { startDate, endDate } })
};

// Utility functions
export const apiUtils = {
  // التحقق من اتصال السيرفر
  healthCheck: () => api.get('/health'),

  // اختبار CORS
  corsTest: () => api.get('/cors-test'),

  // تنظيف localStorage
  clearAuthData: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userPreferences');
  },

  // التحقق من وجود توكن
  hasValidToken: (): boolean => {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      return !isExpired;
    } catch {
      return false;
    }
  },

  // إعادة توجيه لل login
  redirectToLogin: () => {
    apiUtils.clearAuthData();
    window.location.href = '/login';
  },

  // ✅ جديد: تحميل بيانات المستخدم من localStorage
  getUserFromStorage: () => {
    try {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  // ✅ جديد: حفظ بيانات المستخدم في localStorage
  saveUserToStorage: (userData: any) => {
    try {
      localStorage.setItem('userData', JSON.stringify(userData));
      return true;
    } catch {
      return false;
    }
  },

  // ✅ جديد: تحميل التفضيلات من localStorage
  getPreferencesFromStorage: () => {
    try {
      const preferences = localStorage.getItem('userPreferences');
      return preferences ? JSON.parse(preferences) : null;
    } catch {
      return null;
    }
  },

  // ✅ جديد: حفظ التفضيلات في localStorage
  savePreferencesToStorage: (preferences: any) => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      return true;
    } catch {
      return false;
    }
  },

  // ✅ جديد: تنسيق الأعداد (مثل 1K, 1M)
  formatCount: (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  },

  // ✅ جديد: تحميل بيانات المشاركات من localStorage
  getShareDataFromStorage: (videoId: number) => {
    try {
      const shareData = localStorage.getItem(`share_${videoId}`);
      return shareData ? JSON.parse(shareData) : null;
    } catch {
      return null;
    }
  },

  // ✅ جديد: حفظ بيانات المشاركات في localStorage
  saveShareDataToStorage: (videoId: number, shareData: any) => {
    try {
      localStorage.setItem(`share_${videoId}`, JSON.stringify(shareData));
      return true;
    } catch {
      return false;
    }
  },

  // ✅ جديد: التحقق مما إذا شارك المستخدم الفيديو
  hasUserSharedVideo: (videoId: number): boolean => {
    try {
      const shareData = localStorage.getItem(`share_${videoId}`);
      return shareData ? JSON.parse(shareData).shared : false;
    } catch {
      return false;
    }
  },

  // ✅ جديد: تحديث حالة المشاركة محلياً
  updateLocalShareStatus: (videoId: number, shared: boolean) => {
    try {
      const shareData = {
        shared,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`share_${videoId}`, JSON.stringify(shareData));
      return true;
    } catch {
      return false;
    }
  },

  // ✅ جديد: الكشف عن نوع الجهاز
  isMobileDevice: (): boolean => {
    return window.innerWidth <= 768;
  },

  // ✅ جديد: منع التمرير على الجوال
  preventBodyScroll: (prevent: boolean) => {
    if (prevent) {
      document.body.classList.add('body-no-scroll');
    } else {
      document.body.classList.remove('body-no-scroll');
    }
  },

  // ✅ جديد: الحصول على أبعاد الشاشة
  getScreenDimensions: () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth <= 768
    };
  }
};

// Export default api
export default api;
