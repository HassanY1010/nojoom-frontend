import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../services/socket';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد مكونات الإدارة
import ReportManagement from '../components/admin/ReportManagement.jsx';
import UserManagement from '../components/admin/UserManagement.jsx';
import VideoManagement from '../components/admin/VideoManagement.jsx';
import SystemSettings from '../components/admin/SystemSettings.jsx';

// الأنواع (Types)
interface Stats {
  totalUsers: number;
  totalVideos: number;
  totalMessages: number;
  activeUsers: number;
  storageUsed: number;
  dailyUploads: number;
  serverLoad: number;
  responseTime: number;
  pendingReports: number;
  totalReports: number;
  bannedUsers: number;
  pinnedVideos: number;
  totalViews: number;
  totalLikes: number;
  todayUsers: number;
  todayReports: number;
  resolvedReports: number;
  rejectedReports: number;
}

interface Activity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  user: string;
}

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  action: () => void;
}

interface Notification {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalVideos: 0,
    totalMessages: 0,
    activeUsers: 0,
    storageUsed: 0,
    dailyUploads: 0,
    serverLoad: 0,
    responseTime: 0,
    pendingReports: 0,
    totalReports: 0,
    bannedUsers: 0,
    pinnedVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    todayUsers: 0,
    todayReports: 0,
    resolvedReports: 0,
    rejectedReports: 0
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState<Notification>({
    message: '',
    type: 'success',
    visible: false
  });

  useEffect(() => {
    if (user && !isAdmin) {
      console.warn('⚠️ User is not admin, redirecting to home');
      navigate('/');
      return;
    }
    
    if (isAdmin) {
      fetchStats();
      fetchRecentActivity();
      setupRealTimeUpdates();
    }
  }, [user, isAdmin, navigate]);

  const setupRealTimeUpdates = () => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('admin_stats_update', (updatedStats) => {
        setStats(prev => ({ ...prev, ...updatedStats }));
      });
      
      socket.on('admin_activity', (activity) => {
        setRecentActivity(prev => [activity, ...prev.slice(0, 14)]);
      });

      socket.on('broadcast_sent', (data) => {
        if (data.success) {
          showNotification('Broadcast sent successfully!', 'success');
        } else {
          showNotification('Failed to send broadcast', 'error');
        }
      });

      socket.on('new_report', (reportData) => {
        const newActivity = {
          id: Date.now(),
          type: 'report',
          message: `New report: ${reportData.reason} for video by @${reportData.video_owner_username}`,
          timestamp: new Date().toISOString(),
          user: reportData.reporter_username
        };
        
        setRecentActivity(prev => [newActivity, ...prev.slice(0, 14)]);
        
        setStats(prev => ({
          ...prev,
          pendingReports: prev.pendingReports + 1,
          totalReports: prev.totalReports + 1
        }));
      });

      socket.on('report_resolved', (reportData) => {
        setStats(prev => ({
          ...prev,
          pendingReports: Math.max(0, prev.pendingReports - 1)
        }));
      });

      socket.on('user_banned', (data) => {
        const newActivity = {
          id: Date.now(),
          type: 'user',
          message: `Banned user: ${data.username}`,
          timestamp: new Date().toISOString(),
          user: data.admin_username
        };
        setRecentActivity(prev => [newActivity, ...prev.slice(0, 14)]);
        setStats(prev => ({ ...prev, bannedUsers: prev.bannedUsers + 1 }));
      });

      socket.on('video_deleted', (data) => {
        const newActivity = {
          id: Date.now(),
          type: 'upload',
          message: `Deleted video: ${data.video_description}`,
          timestamp: new Date().toISOString(),
          user: data.admin_username
        };
        setRecentActivity(prev => [newActivity, ...prev.slice(0, 14)]);
      });
    }
  };

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      showNotification('Failed to fetch statistics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const mockActivities = [
        {
          id: 1,
          type: 'system',
          message: 'System started successfully',
          timestamp: new Date().toISOString(),
          user: 'system'
        },
        {
          id: 2,
          type: 'user',
          message: 'New user registered: john_doe',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          user: 'system'
        }
      ];
      setRecentActivity(mockActivities);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      showNotification('Failed to fetch recent activity', 'error');
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      showNotification('Please enter a broadcast message', 'error');
      return;
    }

    try {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('broadcast_admin', {
          content: broadcastMessage.trim(),
          timestamp: new Date().toISOString(),
          admin: user?.username
        });
        
        const newActivity = {
          id: Date.now(),
          type: 'broadcast',
          message: `Sent broadcast: "${broadcastMessage.trim()}"`,
          timestamp: new Date().toISOString(),
          user: user?.username || 'Admin'
        };
        
        setRecentActivity(prev => [newActivity, ...prev.slice(0, 14)]);
        setBroadcastMessage('');
      } else {
        showNotification('Socket connection not available', 'error');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      showNotification('Failed to send broadcast', 'error');
    }
  };

  const sendTestBroadcast = () => {
    const testMessages = [
      "🎉 Welcome to our platform! Enjoy the new features!",
      "⚠️ System maintenance scheduled for tonight at 2 AM",
      "🚀 New update coming soon with amazing features!",
      "❤️ Thank you for being an active member of our community!",
      "📢 Important announcement: Check out our new guidelines"
    ];
    
    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    setBroadcastMessage(randomMessage);
  };

  const clearBroadcast = () => {
    setBroadcastMessage('');
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const quickActions: QuickAction[] = [
    {
      icon: '🚩',
      label: 'Reports',
      description: 'Manage video and user reports',
      action: () => setActiveTab('reports')
    },
    {
      icon: '🎥',
      label: 'Videos',
      description: 'Moderate videos and content',
      action: () => setActiveTab('videos')
    },
    {
      icon: '👥',
      label: 'Users',
      description: 'Manage users and permissions',
      action: () => setActiveTab('users')
    },
    {
      icon: '⚙️',
      label: 'Settings',
      description: 'System configuration',
      action: () => setActiveTab('settings')
    }
  ];

  const statCards = [
    { 
      icon: '👥', 
      value: stats.totalUsers, 
      label: 'Total Users', 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10'
    },
    { 
      icon: '🎥', 
      value: stats.totalVideos, 
      label: 'Total Videos', 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10'
    },
    { 
      icon: '💬', 
      value: stats.totalMessages, 
      label: 'Messages', 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10'
    },
    { 
      icon: '⚡', 
      value: stats.activeUsers, 
      label: 'Active Now', 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10'
    },
    { 
      icon: '🚩', 
      value: stats.pendingReports, 
      label: 'Pending Reports', 
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10'
    },
    { 
      icon: '📊', 
      value: stats.totalReports, 
      label: 'Total Reports', 
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/10'
    },
    { 
      icon: '💾', 
      value: `${(stats.storageUsed / (1024 * 1024 * 1024)).toFixed(1)}GB`, 
      label: 'Storage Used', 
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-500/10'
    },
    { 
      icon: '📈', 
      value: stats.dailyUploads, 
      label: 'Today Uploads', 
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-500/10'
    },
    { 
      icon: '🚫', 
      value: stats.bannedUsers, 
      label: 'Banned Users', 
      color: 'from-red-500 to-red-700',
      bgColor: 'bg-red-500/10'
    },
    { 
      icon: '📌', 
      value: stats.pinnedVideos, 
      label: 'Pinned Videos', 
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/10'
    },
    { 
      icon: '👁️', 
      value: stats.totalViews, 
      label: 'Total Views', 
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-500/10'
    },
    { 
      icon: '❤️', 
      value: stats.totalLikes, 
      label: 'Total Likes', 
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-500/10'
    },
  ];

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-black pt-16 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="text-4xl sm:text-6xl mb-4">🚫</div>
          <h2 className="text-white text-lg sm:text-xl font-bold mb-3 sm:mb-4">Access Denied</h2>
          <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
            Administrator privileges required to access this page.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-white text-black px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium hover:bg-gray-200 transition-colors text-sm sm:text-base"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'reports':
        return <ReportManagement />;
      case 'videos':
        return <VideoManagement />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            className={`${stat.bgColor} rounded-lg p-2 sm:p-3 lg:p-4 border border-gray-700 hover:border-gray-600 transition-colors relative overflow-hidden`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <div className="text-lg sm:text-xl lg:text-2xl">
                {stat.icon}
              </div>
              {isLoading && (
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="text-sm sm:text-base lg:text-lg font-bold mb-0.5 sm:mb-1">
              {typeof stat.value === 'number' && stat.value > 9999 
                ? `${(stat.value / 1000).toFixed(1)}k` 
                : stat.value}
            </div>
            <div className="text-gray-400 text-xs sm:text-sm">{stat.label}</div>
            
            {/* Gradient Accent */}
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stat.color}`}></div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Broadcast & Actions */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Broadcast Section */}
          <div className="bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">📢 Broadcast Message</h2>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="relative">
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Send a message to all users... This will appear in the floating chat bar and chat boxes."
                  className="w-full bg-gray-800 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600 resize-none h-24 sm:h-32 placeholder-gray-400 transition-colors text-sm sm:text-base"
                  maxLength={200}
                />
                <div className="absolute bottom-2 right-2 text-xs sm:text-sm text-gray-400">
                  {broadcastMessage.length}/200
                </div>
              </div>
              
              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                <button
                  onClick={sendBroadcast}
                  disabled={!broadcastMessage.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:text-gray-400 transition-all font-medium flex items-center justify-center space-x-2 disabled:cursor-not-allowed text-sm sm:text-base flex-1"
                >
                  <span>📢</span>
                  <span>Send Broadcast</span>
                </button>
                
                <button
                  onClick={sendTestBroadcast}
                  className="bg-gray-800 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium text-xs sm:text-sm"
                >
                  Test Message
                </button>
                
                <button
                  onClick={clearBroadcast}
                  className="bg-gray-800 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium text-xs sm:text-sm"
                >
                  Clear
                </button>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 sm:p-3">
                <p className="text-yellow-400 text-xs sm:text-sm">
                  <strong>Note:</strong> This message will be sent to all online users and will appear in:
                </p>
                <ul className="text-yellow-400/80 text-xs sm:text-sm mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                  <li>• Floating chat bar at the top</li>
                  <li>• Chat boxes in video players</li>
                  <li>• Moving marquee with 4 copies of the message</li>
                  <li>• Automatically deleted after 8 seconds</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">🚀 Quick Actions</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  onClick={action.action}
                  className="bg-gray-800 text-white p-3 sm:p-4 rounded-lg text-left hover:bg-gray-700 transition-colors group border border-gray-700 hover:border-gray-600"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                    <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">
                      {action.icon}
                    </span>
                    <span className="font-medium text-sm sm:text-base">{action.label}</span>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm">{action.description}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-700 h-full">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">📝 Recent Activity</h2>
              <button
                onClick={fetchRecentActivity}
                className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm bg-gray-800 px-2 sm:px-3 py-1 rounded"
              >
                Refresh
              </button>
            </div>
            
            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-400">
                  <div className="text-3xl sm:text-4xl mb-2">📝</div>
                  <p className="text-sm sm:text-base">No activity yet</p>
                  <p className="text-xs sm:text-sm mt-1">Activities will appear here</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <motion.div
                    key={activity.id}
                    className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors group border border-gray-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-1.5 sm:mt-2 flex-shrink-0 ${
                      activity.type === 'broadcast' ? 'bg-yellow-400' :
                      activity.type === 'upload' ? 'bg-green-400' :
                      activity.type === 'user' ? 'bg-blue-400' :
                      activity.type === 'report' ? 'bg-red-400' : 
                      'bg-purple-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs sm:text-sm group-hover:text-white/90 leading-relaxed">
                        {activity.message}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5 sm:mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()} • {activity.user}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-4 sm:mt-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 sm:p-4 border border-green-500/20">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-medium text-sm sm:text-base">System Status: All Systems Operational</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Web Server</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Database</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Socket Server</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">File Storage</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-8">
          <div className="text-center lg:text-left mb-4 lg:mb-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Welcome, <span className="text-white font-medium">{user.username}</span>
              <span className="ml-2 bg-purple-600 px-2 py-0.5 sm:py-1 rounded text-xs">ADMIN</span>
            </p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex space-x-1 sm:space-x-2 mb-4 lg:mb-0 overflow-x-auto pb-2">
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'reports', label: 'Reports', badge: stats.pendingReports },
              { key: 'videos', label: 'Videos' },
              { key: 'users', label: 'Users' },
              { key: 'settings', label: 'Settings' }
            ].map((tab) => (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors whitespace-nowrap relative text-xs sm:text-sm ${
                  activeTab === tab.key 
                    ? 'bg-white text-black' 
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-5 flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 justify-center lg:justify-start">
            <button
              onClick={fetchStats}
              disabled={isLoading}
              className="bg-gray-800 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-1 sm:space-x-2 disabled:opacity-50 text-xs sm:text-sm"
            >
              <span>🔄</span>
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <div className="text-xs sm:text-sm text-gray-400 hidden sm:block">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Render Active Tab */}
        {renderActiveTab()}
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification.visible && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className={`fixed top-16 sm:top-20 right-3 sm:right-6 p-3 sm:p-4 rounded-lg font-medium z-50 shadow-lg text-sm sm:text-base ${
              notification.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <span>✅</span>
              ) : (
                <span>❌</span>
              )}
              <span>{notification.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;