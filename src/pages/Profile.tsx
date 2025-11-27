import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import EditProfileModal from '../components/EditProfileModal';
import FollowersModal from '../components/FollowersModal';
import FollowingModal from '../components/FollowingModal';
import LikesModal from '../components/LikesModal';
import SettingsModal from '../components/SettingsModal';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  followers_count: number;
  following_count: number;
  likes_count: number;
  views_count: number;
  social_links: string;
  created_at: string;
}

interface Video {
  id: number;
  user_id: number;
  path: string;
  thumbnail: string;
  description: string;
  views: number;
  likes: number;
  created_at: string;
  is_liked?: boolean;
  comment_count?: number;
}

interface SocialLinks {
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'likes'>('videos');
  const [loading, setLoading] = useState(true);
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [error, setError] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'oldest'>('latest');

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Fetching profile for username:', username);

      const response = await api.get(`/users/profile/${username}`);
      console.log('✅ Profile data received:', response.data);

      setProfileUser(response.data.user);
      setVideos(response.data.videos || []);
      setIsFollowing(response.data.isFollowing || false);

      // Parse social links
      if (response.data.user.social_links) {
        try {
          const links = JSON.parse(response.data.user.social_links);
          setSocialLinks(links);
        } catch (e) {
          console.error('Error parsing social links:', e);
        }
      }

      // Fetch liked videos only for own profile
      if (currentUser?.id === response.data.user.id) {
        try {
          const likedResponse = await api.get('/videos/user/liked');
          setLikedVideos(likedResponse.data.videos || []);
        } catch (likeError) {
          console.error('Failed to fetch liked videos:', likeError);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch profile:', error);
      setError(error.response?.data?.error || t('failedLoadProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profileUser) return;

    try {
      if (isFollowing) {
        await api.delete(`/users/follow/${profileUser.id}`);
      } else {
        await api.post(`/users/follow/${profileUser.id}`);
      }
      setIsFollowing(!isFollowing);
      setProfileUser(prev => prev ? {
        ...prev,
        followers_count: isFollowing ? prev.followers_count - 1 : prev.followers_count + 1
      } : null);
    } catch (error: any) {
      console.error('Follow action failed:', error);
      setError(error.response?.data?.error || t('followActionFailed'));
    }
  };

  const handleLike = async (videoId: number) => {
    try {
      const videoIndex = videos.findIndex(v => v.id === videoId);
      if (videoIndex === -1) return;

      const video = videos[videoIndex];
      const newVideos = [...videos];

      if (video.is_liked) {
        await api.delete(`/videos/${videoId}/like`);
        newVideos[videoIndex] = {
          ...video,
          likes: video.likes - 1,
          is_liked: false
        };
      } else {
        await api.post(`/videos/${videoId}/like`);
        newVideos[videoIndex] = {
          ...video,
          likes: video.likes + 1,
          is_liked: true
        };
      }

      setVideos(newVideos);
    } catch (error: any) {
      console.error('Like action failed:', error);
      setError(error.response?.data?.error || t('likeActionFailed'));
    }
  };

  const handleVideoClick = (videoId: number) => {
    console.log('🎬 Navigating to video in home page:', videoId);

    const navigateEvent = new CustomEvent('navigateToVideo', {
      detail: { videoId }
    });
    window.dispatchEvent(navigateEvent);

    navigate('/');
  };

  const getThumbnailUrl = (video: Video) => {
    if (video.thumbnail) {
      return `${import.meta.env.VITE_API_URL}${video.thumbnail}`;
    }
    return '${import.meta.env.VITE_API_URL}/default-thumbnail.jpg';
  };

  const handleProfileUpdate = (updatedUser: any) => {
    console.log('✅ Profile updated successfully:', updatedUser);
    setProfileUser(updatedUser);

    if (updatedUser.social_links) {
      try {
        const links = JSON.parse(updatedUser.social_links);
        setSocialLinks(links);
      } catch (e) {
        console.error('Error parsing updated social links:', e);
      }
    }

    fetchProfileData();
  };

  const getSocialIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      instagram: '📷',
      twitter: '🐦',
      youtube: '📺',
      tiktok: '🎵',
      website: '🌐'
    };
    return icons[platform] || '🔗';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 🎨 توليد gradient عشوائي لكل فيديو
  const getVideoGradient = (videoId: number): string => {
    const gradients = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-yellow-500 to-orange-500',
      'from-teal-500 to-green-500',
      'from-violet-500 to-fuchsia-500',
      'from-sky-500 to-blue-500',
    ];

    return gradients[videoId % gradients.length];
  };

  const shareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${profileUser?.username}`;
    navigator.clipboard.writeText(profileUrl)
      .then(() => {
        alert('Profile link copied to clipboard!');
      })
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = profileUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Profile link copied to clipboard!');
      });
  };

  const getUserVideos = async (sortBy: 'latest' | 'trending' | 'oldest') => {
    if (!profileUser) return;

    try {
      const response = await api.get(`/videos/user/${profileUser.id}?sortBy=${sortBy}`);
      setVideos(response.data.videos || []);
    } catch (error) {
      console.error('Failed to fetch user videos:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-white text-xl font-bold mb-4">{t('errorLoadingProfile')}</h2>
          <p className="text-gray-400 mb-2">{error}</p>
          <p className="text-gray-500 text-sm mb-6">
            {t('checkConsoleForDetails')}
          </p>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
            <button
              onClick={fetchProfileData}
              className="bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              {t('tryAgain')}
            </button>
            <Link
              to="/"
              className="bg-gray-800 text-white px-4 py-2 rounded-full font-medium hover:bg-gray-700 transition-colors border border-gray-600 text-center"
            >
              {t('goHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-white text-xl font-bold mb-2">{t('userNotFound')}</h2>
          <p className="text-gray-400 mb-4">
            {t('userDoesntExist')}
          </p>
          <Link
            to="/"
            className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors"
          >
            {t('goHome')}
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const displayVideos = activeTab === 'videos' ? videos : (isOwnProfile ? likedVideos : []);

  return (
    <div className="min-h-screen bg-black text-white pt-16">
      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleProfileUpdate}
        currentUser={profileUser}
      />

      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={profileUser.id}
      />

      <FollowingModal
        isOpen={isFollowingModalOpen}
        onClose={() => setIsFollowingModalOpen(false)}
        userId={profileUser.id}
      />

      <LikesModal
        isOpen={isLikesModalOpen}
        onClose={() => setIsLikesModalOpen(false)}
        userId={profileUser.id}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        userId={profileUser.id}
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>⚠</span>
                <span className="text-sm sm:text-base">{error}</span>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-300 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-gray-900 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className={`flex flex-col sm:flex-row items-start ${isRTL ? 'sm:space-x-reverse sm:space-x-6' : 'sm:space-x-6'} space-y-4 sm:space-y-0`}>
            {/* Avatar */}
            <div className="flex justify-center sm:justify-start w-full sm:w-auto">
              <div className="relative">
                <img
                  src={
                    profileUser.avatar
                      ? `${import.meta.env.VITE_API_URL}${profileUser.avatar}`
                      : '/default-avatar.png'
                  }
                  alt={profileUser.username}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-gray-600"
                  onError={(e) => {
                    e.currentTarget.src = '/default-avatar.png';
                  }}
                />
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row items-start justify-between space-y-4 sm:space-y-0">
                <div className="w-full text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold">@{profileUser.username}</h1>
                  <p className="text-gray-400 mt-1 text-sm sm:text-base">
                    {profileUser.bio || t('noBioYet')}
                  </p>

                  {/* Social Links */}
                  {Object.keys(socialLinks).length > 0 && (
                    <div className={`flex ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} mt-3 justify-center sm:justify-start`}>
                      {Object.entries(socialLinks).map(([platform, url]) => (
                        url && (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xl sm:text-2xl hover:scale-110 transition-transform"
                            title={platform}
                          >
                            {getSocialIcon(platform)}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className={`flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto ${isRTL ? 'sm:space-x-reverse sm:space-x-3' : 'sm:space-x-3'}`}>
                  {!isOwnProfile && (
                    <button
                      onClick={handleFollow}
                      className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-colors text-sm sm:text-base ${isFollowing
                        ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600'
                        : 'bg-white text-black hover:bg-gray-200'
                        }`}
                    >
                      {isFollowing ? t('following') : t('follow')}
                    </button>
                  )}
                  {isOwnProfile && (
                    <div className={`flex flex-wrap justify-center gap-2 ${isRTL ? 'sm:space-x-reverse sm:space-x-3' : 'sm:space-x-3'}`}>
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="bg-blue-600 text-white px-3 sm:px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                      >
                        <span>✏️</span>
                        <span className="hidden sm:inline">{t('editProfile')}</span>
                        <span className="sm:hidden">{t('edit')}</span>
                      </button>
                      <button
                        onClick={shareProfile}
                        className="bg-green-600 text-white px-3 sm:px-6 py-2 rounded-full font-medium hover:bg-green-700 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                      >
                        <span>📤</span>
                        <span className="hidden sm:inline">{t('share')}</span>
                      </button>
                      <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="bg-gray-600 text-white px-3 sm:px-6 py-2 rounded-full font-medium hover:bg-gray-700 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                      >
                        <span>⚙️</span>
                        <span className="hidden sm:inline">{t('settings')}</span>
                      </button>
                      <Link
                        to="/upload"
                        className="bg-white text-black px-3 sm:px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors text-sm sm:text-base flex items-center space-x-1 sm:space-x-2"
                      >
                        <span>📹</span>
                        <span className="hidden sm:inline">{t('upload')}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className={`flex flex-wrap justify-center sm:justify-start ${isRTL ? 'space-x-reverse space-x-4 sm:space-x-8' : 'space-x-4 sm:space-x-8'} mt-4 sm:mt-6`}>
                <button
                  onClick={() => setIsFollowersModalOpen(true)}
                  className="text-center hover:scale-105 transition-transform cursor-pointer px-2"
                >
                  <div className="text-base sm:text-lg font-bold">{formatNumber(profileUser.followers_count || 0)}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">{t('followers')}</div>
                </button>

                <button
                  onClick={() => setIsFollowingModalOpen(true)}
                  className="text-center hover:scale-105 transition-transform cursor-pointer px-2"
                >
                  <div className="text-base sm:text-lg font-bold">{formatNumber(profileUser.following_count || 0)}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">{t('following')}</div>
                </button>

                <button
                  onClick={() => setIsLikesModalOpen(true)}
                  className="text-center hover:scale-105 transition-transform cursor-pointer px-2"
                >
                  <div className="text-base sm:text-lg font-bold">{formatNumber(profileUser.likes_count || 0)}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">{t('likes')}</div>
                </button>

                <div className="text-center px-2">
                  <div className="text-base sm:text-lg font-bold">{formatNumber(profileUser.views_count || 0)}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">{t('views')}</div>
                </div>

                <div className="text-center px-2">
                  <div className="text-base sm:text-lg font-bold">{formatNumber(videos.length)}</div>
                  <div className="text-gray-400 text-xs sm:text-sm">{t('videos')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Options */}
        {isOwnProfile && activeTab === 'videos' && videos.length > 0 && (
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className={`flex ${isRTL ? 'space-x-reverse space-x-1 sm:space-x-2' : 'space-x-1 sm:space-x-2'} bg-gray-800 rounded-lg p-1`}>
              {[
                { id: 'latest', label: t('latest') },
                { id: 'trending', label: t('trending') },
                { id: 'oldest', label: t('oldest') }
              ].map((sort) => (
                <button
                  key={sort.id}
                  onClick={() => {
                    setSortBy(sort.id as any);
                    getUserVideos(sort.id as any);
                  }}
                  className={`px-2 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${sortBy === sort.id
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={`flex ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} bg-gray-900 rounded-xl p-1 mb-4 sm:mb-6 w-full max-w-md mx-auto`}>
          {[
            { id: 'videos' as const, label: t('videos') },
            ...(isOwnProfile ? [{ id: 'likes' as const, label: t('likes') }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${activeTab === tab.id
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Videos Grid - TikTok Style */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1"
          >
            {displayVideos.map((video) => (
              <motion.div
                key={video.id}
                className="relative aspect-[9/16] overflow-hidden cursor-pointer group"
                onMouseEnter={() => setHoveredVideo(video.id)}
                onMouseLeave={() => setHoveredVideo(null)}
                onClick={() => handleVideoClick(video.id)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${getVideoGradient(video.id)}`} />

                {/* Thumbnail */}
                <img
                  src={getThumbnailUrl(video)}
                  alt={video.description || 'Video thumbnail'}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}
                />

                {/* Play Icon - Center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 ${hoveredVideo === video.id ? 'scale-110 bg-white/50' : 'scale-100'
                    }`}>
                    <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1"></div>
                  </div>
                </div>

                {/* Stats Overlay - Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">{formatNumber(video.views || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold">{formatNumber(video.likes || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className={`absolute inset-0 bg-black/20 transition-opacity duration-200 ${hoveredVideo === video.id ? 'opacity-100' : 'opacity-0'
                  }`} />

                {/* Like Button - Top Right (appears on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(video.id);
                  }}
                  className={`absolute top-2 right-2 transition-all duration-200 ${hoveredVideo === video.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                >
                  <div className={`w-8 h-8 backdrop-blur-sm rounded-full flex items-center justify-center ${video.is_liked ? 'bg-red-500/80' : 'bg-black/50'
                    } hover:scale-110 transition-transform`}>
                    {video.is_liked ? '❤️' : '🤍'}
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Empty State */}
        {displayVideos.length === 0 && (
          <motion.div
            className="text-center py-12 sm:py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-4xl sm:text-6xl mb-4">
              {activeTab === 'likes' ? '❤️' : (isOwnProfile ? '🎬' : '📹')}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              {activeTab === 'likes'
                ? t('noLikedVideos')
                : (isOwnProfile ? t('noVideosYet') : t('noVideos'))
              }
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto px-4 text-sm sm:text-base">
              {activeTab === 'likes'
                ? t('likedVideosAppearHere')
                : (isOwnProfile
                  ? t('uploadFirstVideo')
                  : t('userNoVideos')
                )
              }
            </p>
            {isOwnProfile && activeTab === 'videos' && (
              <Link
                to="/upload"
                className="bg-white text-black px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium hover:bg-gray-200 transition-colors inline-flex items-center space-x-2 text-sm sm:text-base"
              >
                <span>📹</span>
                <span>{t('uploadVideo')}</span>
              </Link>
            )}
          </motion.div>
        )}

        {/* Loading More Indicator */}
        {displayVideos.length > 0 && (
          <div className="text-center py-6 sm:py-8">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 text-sm mt-2">{t('loadingMore')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;