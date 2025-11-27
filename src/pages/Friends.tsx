import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  id: number;
  username: string;
  avatar: string;
  bio: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_online?: boolean;
}

const Friends: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'followers' | 'following'>('following');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // دالة مساعدة للحصول على رابط الصورة الكامل
  const getFullAvatarUrl = (avatarPath: string) => {
    if (!avatarPath) return '/default-avatar.png';
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${import.meta.env.VITE_API_URL}${avatarPath}`;
  };

  useEffect(() => {
    if (activeTab === 'followers') {
      fetchFollowers();
    } else if (activeTab === 'following') {
      fetchFollowing();
    } else if (activeTab === 'search' && !searchQuery) {
      fetchSuggestedUsers();
    }
  }, [activeTab]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      fetchSuggestedUsers();
      return;
    }
    setSearchLoading(true);
    try {
      const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchFollowers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/followers');
      setFollowers(response.data.followers || []);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/following');
      setFollowing(response.data.following || []);
    } catch (error) {
      console.error('Failed to fetch following:', error);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/suggested-users?limit=20');
      setSuggestedUsers(response.data.data || []);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch suggested users:', error);
      setSuggestedUsers([]);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: number, follow: boolean) => {
    try {
      if (follow) {
        await api.post(`/users/follow/${userId}`);
      } else {
        await api.delete(`/users/follow/${userId}`);
      }

      // Update all user lists
      const updateFollowStatus = (users: User[]) =>
        users.map(u =>
          u.id === userId ? {
            ...u,
            is_following: follow,
            followers_count: follow ? u.followers_count + 1 : Math.max(0, u.followers_count - 1)
          } : u
        );

      setSearchResults(prev => updateFollowStatus(prev));
      setFollowers(prev => updateFollowStatus(prev));
      setFollowing(prev => updateFollowStatus(prev));
      setSuggestedUsers(prev => updateFollowStatus(prev));

      // Refresh counts
      if (activeTab === 'followers') {
        fetchFollowers();
      } else if (activeTab === 'following') {
        fetchFollowing();
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  const getDisplayedUsers = () => {
    switch (activeTab) {
      case 'search':
        return searchQuery ? searchResults : suggestedUsers;
      case 'followers':
        return followers;
      case 'following':
        return following;
      default:
        return [];
    }
  };

  const displayedUsers = getDisplayedUsers();

  const getEmptyStateConfig = () => {
    if (activeTab === 'search') {
      if (searchQuery) {
        return {
          icon: '🔍',
          title: t('noUsersFound'),
          description: `${t('noResultsFor')} "${searchQuery}"`
        };
      }
      return {
        icon: '👥',
        title: t('searchForUsers'),
        description: t('findPeopleToFollow')
      };
    } else if (activeTab === 'followers') {
      return {
        icon: '👁️',
        title: t('noFollowersYet'),
        description: t('whenPeopleFollowYou')
      };
    } else {
      return {
        icon: '⭐',
        title: t('notFollowingAnyone'),
        description: t('followPeopleToSeeContent')
      };
    }
  };

  const emptyState = getEmptyStateConfig();

  return (
    <div className="min-h-screen bg-black text-white pt-16 pb-20">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">{t('peopleYouFollow')}</h1>
          <p className="text-gray-400 text-sm sm:text-base">{t('discoverAndConnect')}</p>
        </div>

        {/* Tabs */}
        <div className={`flex ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} bg-gray-900 rounded-xl p-1 mb-4 sm:mb-6`}>
          {[
            { id: 'following' as const, label: t('following'), count: following.length },
            { id: 'followers' as const, label: t('followers'), count: followers.length },
            { id: 'search' as const, label: t('discover'), count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${activeTab === tab.id
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <span className="truncate">{tab.label}</span>
                {tab.count !== null && (
                  <span className="bg-gray-700 text-white text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-5 sm:min-w-6 flex items-center justify-center">
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {activeTab === 'search' && (
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder={t('searchUsers')}
                className="w-full px-4 py-2 sm:py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-400 text-sm sm:text-base"
              />
              <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2`}>
                {searchLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-gray-400 text-sm">🔍</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-2 sm:space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm sm:text-base">{t('loading')}</p>
            </div>
          ) : displayedUsers.length > 0 ? (
            <AnimatePresence>
              {displayedUsers.map((userItem) => (
                <motion.div
                  key={userItem.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-900 rounded-lg p-3 sm:p-4 flex items-center justify-between border border-gray-700"
                >
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2 sm:space-x-3' : 'space-x-2 sm:space-x-3'} flex-1 min-w-0`}>
                    <div className="relative flex-shrink-0">
                      <img
                        src={getFullAvatarUrl(userItem.avatar)}
                        alt={userItem.username}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/default-avatar.png';
                        }}
                      />
                      {userItem.is_online && (
                        <div className={`absolute -top-0.5 ${isRTL ? '-left-0.5' : '-right-0.5'} w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-gray-900`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${userItem.username}`}
                        className="font-medium hover:text-gray-300 transition-colors block mb-0.5 sm:mb-1 text-sm sm:text-base truncate"
                      >
                        @{userItem.username}
                      </Link>
                      <p className="text-gray-400 text-xs sm:text-sm truncate">
                        {userItem.bio || t('noBioYet')}
                      </p>
                      <div className={`flex ${isRTL ? 'space-x-reverse space-x-2 sm:space-x-4' : 'space-x-2 sm:space-x-4'} text-xs text-gray-500 mt-1`}>
                        <span className="text-xs">
                          {userItem.followers_count} {t('followers')}
                        </span>
                        <span className="text-xs">
                          {userItem.following_count} {t('following')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {userItem.id !== user?.id && (
                    <button
                      onClick={() => handleFollow(Number(userItem.id), !userItem.is_following)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-medium transition-colors text-xs sm:text-sm flex-shrink-0 ml-2 ${userItem.is_following
                        ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600'
                        : 'bg-white text-black hover:bg-gray-200'
                        }`}
                    >
                      {userItem.is_following ? t('following') : t('follow')}
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{emptyState.icon}</div>
              <h3 className="text-base sm:text-lg font-medium text-white mb-1 sm:mb-2">
                {emptyState.title}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm px-4">
                {emptyState.description}
              </p>
              {activeTab === 'search' && !searchQuery && (
                <button
                  onClick={fetchSuggestedUsers}
                  className="mt-3 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors text-xs sm:text-sm"
                >
                  {t('refreshSuggestions')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Load More Button (for future pagination) */}
        {displayedUsers.length > 0 && displayedUsers.length % 20 === 0 && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              className="px-6 py-2 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-700 transition-colors border border-gray-600 text-sm sm:text-base"
              onClick={() => {
                // Implement load more functionality here
                console.log('Load more users');
              }}
            >
              {t('loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;