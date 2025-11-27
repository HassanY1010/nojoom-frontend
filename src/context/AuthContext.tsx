import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';
import { recommendationApi } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  social_links: string;
  followers_count: number;
  following_count: number;
  likes_count: number;
  views_count: number;
  total_watch_time: number;
  role: string; // ✅ التأكد من وجود role
  email_verified: boolean;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
  is_banned?: boolean; // ✅ إضافة حقل is_banned
  ban_reason?: string; // ✅ إضافة حقل ban_reason
}

interface UserPreferences {
  preferred_categories: string[];
  content_weights: Record<string, number>;
  excluded_users: number[];
}

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  // الدوال الجديدة للتحكم في الوقت
  checkTimeLimit: (videoId: number) => Promise<{ exceeded: boolean; remainingTime: number }>;
  resetWatchTime: (videoId: number) => Promise<void>;
  // دوال مساعدة
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  isAdmin: boolean; // ✅ إضافة خاصية isAdmin
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('❌ useAuth called outside of AuthProvider!');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user?.theme) {
      if (user.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [user]);

  const handleTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { accessToken } = await authService.refreshToken(refreshToken);
      localStorage.setItem('accessToken', accessToken);
      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('userData');
      const preferencesData = localStorage.getItem('userPreferences');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (preferencesData) {
          setPreferences(JSON.parse(preferencesData));
        }

        try {
          // ✅ استخدام getProfile العادي أولاً
          const freshUserData = await authService.getProfile();
          const userDataToStore = freshUserData.user || freshUserData;
          setUser(userDataToStore);
          localStorage.setItem('userData', JSON.stringify(userDataToStore));

          // تحميل التفضيلات
          await refreshPreferences();
        } catch (error: any) {
          console.error('Failed to fetch fresh user data:', error);
          if (error.response?.status === 401) {
            // حاول تجديد التوكن مرة واحدة فقط
            try {
              await handleTokenRefresh();
              const freshUserData = await authService.getProfile();
              const userDataToStore = freshUserData.user || freshUserData;
              setUser(userDataToStore);
              localStorage.setItem('userData', JSON.stringify(userDataToStore));
              await refreshPreferences();
            } catch (refreshError) {
              console.error('Auto-refresh failed:', refreshError);
              logout();
            }
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const refreshPreferences = async () => {
    try {
      const response = await recommendationApi.getUserPreferences();
      const newPreferences = response.data.preferences || response.data.data;
      setPreferences(newPreferences);
      localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
      console.log('✅ Preferences refreshed successfully');
    } catch (error: any) {
      console.error('Failed to refresh preferences:', error);
      if (error.response?.status === 401) {
        // حاول تجديد التوكن
        try {
          await handleTokenRefresh();
          const response = await recommendationApi.getUserPreferences();
          const newPreferences = response.data.preferences || response.data.data;
          setPreferences(newPreferences);
          localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
        } catch (refreshError) {
          console.error('Auto-refresh for preferences failed:', refreshError);
        }
      }
    }
  };

  const refreshUser = async () => {
    try {
      const freshUserData = await authService.getProfile();
      const userDataToStore = freshUserData.user || freshUserData;
      setUser(userDataToStore);
      localStorage.setItem('userData', JSON.stringify(userDataToStore));
      console.log('✅ User data refreshed successfully');
    } catch (error: any) {
      console.error('Failed to refresh user data:', error);
      if (error.response?.status === 401) {
        try {
          await handleTokenRefresh();
          const freshUserData = await authService.getProfile();
          const userDataToStore = freshUserData.user || freshUserData;
          setUser(userDataToStore);
          localStorage.setItem('userData', JSON.stringify(userDataToStore));
        } catch (refreshError) {
          console.error('Auto-refresh failed:', refreshError);
        }
      }
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);

      try {
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        console.log('✅ User updated successfully in context:', userData);
      } catch (error) {
        console.error('❌ Failed to update user in localStorage:', error);
      }
    } else {
      console.warn('⚠️ Cannot update user: no user logged in');
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences } as UserPreferences;
      setPreferences(updatedPreferences);

      await recommendationApi.updateUserPreferences(updatedPreferences);
      localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
      console.log('✅ Preferences updated successfully');
    } catch (error: any) {
      console.error('Failed to update preferences:', error);
      if (error.response?.status === 401) {
        try {
          await handleTokenRefresh();
          await recommendationApi.updateUserPreferences(updatedPreferences);
          localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
        } catch (refreshError) {
          console.error('Auto-refresh for update preferences failed:', refreshError);
          throw refreshError;
        }
      } else {
        throw error;
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔄 Starting login process for:', email);

      const response = await authService.login(email, password);
      console.log('✅ Login API response (stringified):', JSON.stringify(response, null, 2));
      console.log('✅ Response keys:', Object.keys(response));

      // ✅ البنية الصحيحة من السيرفر: { message, user, accessToken, refreshToken }
      const userData = response.user;
      const accessToken = response.accessToken;
      const refreshToken = response.refreshToken;

      console.log('userData exists?', !!userData);
      console.log('accessToken exists?', !!accessToken);
      console.log('refreshToken exists?', !!refreshToken);

      if (!userData || !accessToken || !refreshToken) {
        console.error('❌ Missing required fields in response');
        console.error('Response structure (stringified):', JSON.stringify(response, null, 2));
        throw new Error('Invalid login response structure');
      }

      console.log('✅ Login API call successful');

      // ✅ التأكد من أن userData تحتوي على role
      if (!userData.role) {
        console.warn('⚠️ Role is missing in login response, setting default role');
        userData.role = 'user'; // قيمة افتراضية
      }

      // ✅ حفظ التوكنات والبيانات
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);

      console.log('✅ Tokens and user data saved to localStorage');

      // تحميل التفضيلات بعد تسجيل الدخول
      await refreshPreferences();

      console.log('✅ Login successful - User role:', userData.role);
    } catch (error) {
      console.error('❌ Login failed:', error);

      // ✅ تنظيف البيانات في حالة فشل تسجيل الدخول
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');

      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const { user: userData, accessToken, refreshToken } = await authService.register(username, email, password);

      const userWithRole = userData.user || userData;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userData', JSON.stringify(userWithRole));
      setUser(userWithRole);

      // تحميل التفضيلات بعد التسجيل
      await refreshPreferences();

      console.log('✅ Registration successful');
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    try {
      // تنظيف جميع بيانات المصادقة
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('userPreferences');

      // تنظيف بيانات الوقت المؤقتة
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('video_watch_time_') || key.startsWith('video_start_time_')) {
          localStorage.removeItem(key);
        }
      });

      setUser(null);
      setPreferences(null);

      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  };
const resendVerificationEmail = async (email: string) => {
  try {
    await authService.resendVerificationEmail(email);
    console.log('✅ Verification email resent successfully');
  } catch (error) {
    console.error('❌ Failed to resend verification email:', error);
    throw error;
  }
};

  // الدوال الجديدة للتحكم في الوقت
  const checkTimeLimit = async (videoId: number) => {
    try {
      const response = await recommendationApi.post('/user/check-time-limit', { videoId });
      return response.data;
    } catch (error) {
      console.error('Failed to check time limit:', error);
      return { exceeded: false, remainingTime: 3 * 60 * 60 * 1000 }; // 3 ساعات افتراضياً
    }
  };

  const resetWatchTime = async (videoId: number) => {
    try {
      await recommendationApi.post('/user/reset-watch-time', { videoId });

      // تنظيف localStorage
      localStorage.removeItem(`video_watch_time_${videoId}`);
      localStorage.removeItem(`video_start_time_${videoId}`);

      console.log('✅ Watch time reset successfully');
    } catch (error) {
      console.error('Failed to reset watch time:', error);
      throw error;
    }
  };

  // دوال مساعدة
  const isAuthenticated = !!user;

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // ✅ خاصية جديدة للتحقق من أن المستخدم مدير
  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    preferences,
    login,
    register,
    logout,
    loading,
    refreshUser,
    updateUser,
    updatePreferences,
    refreshPreferences,
    checkTimeLimit,
    resetWatchTime,
    isAuthenticated,
    hasRole,
    isAdmin,
    resendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};