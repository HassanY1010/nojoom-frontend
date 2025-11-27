// src/pages/Home.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import VideoCard from '../components/VideoCard';
import GuestVideoCard from '../components/GuestVideoCard';
import api from '../services/api';
import { Video } from '../types';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, direction } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const [showNavigation, setShowNavigation] = useState(true);
  const [videoHistory, setVideoHistory] = useState<{ [key: number]: number }>({});
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const navigationTimeoutRef = useRef<NodeJS.Timeout>();

  // ✅ دالة للبحث عن فيديو معين والانتقال إليه
  const findAndSetVideo = (videoId: number) => {
    const targetIndex = videos.findIndex(video => video.id === videoId);
    if (targetIndex !== -1) {
      setCurrentIndex(targetIndex);
      trackVideoView(targetIndex);
      return true;
    }
    return false;
  };

  // ✅ إضافة مستمع للحدث العالمي للانتقال إلى فيديو
  useEffect(() => {
    const handleNavigateToVideo = (event: CustomEvent<{ videoId: number }>) => {
      const { videoId } = event.detail;
      console.log('🎬 Navigating to video from event:', videoId);

      if (findAndSetVideo(videoId)) {
        // إذا كان الفيديو موجوداً في القائمة الحالية
        return;
      }

      // إذا لم يكن الفيديو في القائمة الحالية، جلب الفيديو المحدد
      fetchSpecificVideo(videoId);
    };

    window.addEventListener('navigateToVideo', handleNavigateToVideo as EventListener);

    return () => {
      window.removeEventListener('navigateToVideo', handleNavigateToVideo as EventListener);
    };
  }, [videos]);

  // ✅ دالة لجلب فيديو محدد
  const fetchSpecificVideo = async (videoId: number) => {
    try {
      setLoading(true);
      const response = await api.get(`/videos/${videoId}`);
      const specificVideo = response.data.video;

      if (specificVideo) {
        // تعيين الفيديو المحدد كقائمة الفيديوهات
        setVideos([specificVideo]);
        setCurrentIndex(0);
        trackVideoView(0);
      }
    } catch (error) {
      console.error('Failed to fetch specific video:', error);
      setError(t('failedLoadVideo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    if (user) {
      fetchRecommendedVideos();
      loadWatchHistory();
    }
  }, [user]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos');
      const videosData = response.data.videos || [];
      setVideos(videosData);

      if (videosData.length === 0) {
        setError(t('noVideosAvailable'));
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      setError(t('failedLoadVideos'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedVideos = async () => {
    try {
      const response = await api.get('/videos/recommended');
      setRecommendedVideos(response.data.videos || []);
    } catch (error) {
      console.error('Failed to fetch recommended videos:', error);
      if (recommendedVideos.length === 0 && videos.length > 0) {
        setRecommendedVideos(videos);
      }
    }
  };

  const fetchFollowingVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos/following');
      const followingVideos = response.data.videos || [];
      setVideos(followingVideos);

      if (followingVideos.length === 0) {
        setError(t('noFollowingVideos'));
      }
    } catch (error) {
      console.error('Failed to fetch following videos:', error);
      setError(t('failedLoadFollowing'));
    } finally {
      setLoading(false);
    }
  };

  const loadWatchHistory = async () => {
    try {
      const response = await api.get('/user/watch-history');
      const history = response.data.history || {};
      setVideoHistory(history);
    } catch (error) {
      console.error('Failed to load watch history:', error);
    }
  };

  const handleTabChange = (tab: 'forYou' | 'following') => {
    setActiveTab(tab);
    setCurrentIndex(0);

    if (tab === 'following' && user) {
      fetchFollowingVideos();
    } else if (tab === 'forYou' && user) {
      setVideos(recommendedVideos.length > 0 ? recommendedVideos : videos);
    } else {
      fetchVideos();
    }
  };

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling) return;

    setIsScrolling(true);
    setShowNavigation(true);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(() => {
      setShowNavigation(false);
    }, 3000);

    if (e.deltaY > 0) {
      setCurrentIndex(prev => {
        const nextIndex = Math.min(prev + 1, videos.length - 1);
        trackVideoView(nextIndex);
        return nextIndex;
      });
    } else {
      setCurrentIndex(prev => {
        const prevIndex = Math.max(prev - 1, 0);
        trackVideoView(prevIndex);
        return prevIndex;
      });
    }

    setTimeout(() => setIsScrolling(false), 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setShowNavigation(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isScrolling) return;

    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      setIsScrolling(true);
      setShowNavigation(true);

      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
        setShowNavigation(false);
      }, 3000);

      if (diff > 0) {
        setCurrentIndex(prev => {
          const nextIndex = Math.min(prev + 1, videos.length - 1);
          trackVideoView(nextIndex);
          return nextIndex;
        });
      } else {
        setCurrentIndex(prev => {
          const prevIndex = Math.max(prev - 1, 0);
          trackVideoView(prevIndex);
          return prevIndex;
        });
      }

      setTimeout(() => setIsScrolling(false), 500);
    }
  };

  const trackVideoView = (index: number) => {
    if (videos[index] && user) {
      const videoId = videos[index].id;

      api.post('/user/watch-history', {
        videoId: videoId,
        watchTime: 1,
        completed: false
      }).catch(console.error);
    }
  };

  const handleWatchTimeUpdate = (watchTime: number) => {
    if (user && watchTime > 5 && videos[currentIndex]) {
      api.post('/user/watch-history', {
        videoId: videos[currentIndex].id,
        watchTime: Math.min(watchTime, videos[currentIndex].duration || 60),
        completed: watchTime >= (videos[currentIndex].duration || 60) * 0.8
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (videos.length > 0 && currentIndex < videos.length) {
      const currentVideoId = videos[currentIndex].id;
      console.log(`🎬 Switched to video: ${currentVideoId} - ${videos[currentIndex].title}`);

      navigationTimeoutRef.current = setTimeout(() => {
        setShowNavigation(false);
      }, 3000);
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [currentIndex, videos]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div className="flex flex-col items-center space-y-4 sm:space-y-6 px-4">
          <motion.div
            className="relative"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center">
                <motion.div
                  className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
            </div>
          </motion.div>
          <motion.p
            className="text-white text-base sm:text-lg font-medium text-center"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {t('loadingVideos')}
          </motion.p>
          <motion.p
            className="text-gray-400 text-xs sm:text-sm text-center"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {videos.length > 0 ? t('videosReady', { count: videos.length }) : t('preparingContent')}
          </motion.p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-2xl">
              <span className="text-xl sm:text-2xl">⚠️</span>
            </div>
          </motion.div>
          <motion.h1
            className="text-white text-xl sm:text-2xl font-bold mb-3 sm:mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('somethingWrong')}
          </motion.h1>
          <motion.p
            className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {error}
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={fetchVideos}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
            >
              {t('tryAgain')}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-2xl">
              <span className="text-xl sm:text-2xl">🎬</span>
            </div>
          </motion.div>
          <motion.h1
            className="text-white text-xl sm:text-2xl font-bold mb-3 sm:mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {activeTab === 'following' ? t('noFollowingVideos') : t('noVideos')}
          </motion.h1>
          <motion.p
            className="text-gray-400 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activeTab === 'following'
              ? t('followCreators')
              : t('beFirstCreator')
            }
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            {!user ? (
              <button
                onClick={() => window.location.href = '/register'}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
              >
                {t('getStarted')}
              </button>
            ) : (
              <button
                onClick={fetchVideos}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
              >
                {t('exploreVideos')}
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="h-screen bg-black overflow-hidden relative"
      onWheel={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Navigation Tabs - Responsive */}
      {user && showNavigation && (
        <motion.div
          className={`absolute top-4 z-40 flex space-x-2 sm:space-x-4 backdrop-blur-sm bg-black/30 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-white/10 ${isRTL
            ? 'right-4 sm:right-1/2 sm:translate-x-1/2'
            : 'left-4 sm:left-1/2 sm:-translate-x-1/2'
            }`}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => handleTabChange('forYou')}
            className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all duration-200 text-xs sm:text-sm ${activeTab === 'forYou'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'bg-gray-800 text-white hover:bg-gray-700 hover:scale-105'
              }`}
          >
            {t('forYou')}
          </button>
          <button
            onClick={() => handleTabChange('following')}
            className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all duration-200 text-xs sm:text-sm ${activeTab === 'following'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
              : 'bg-gray-800 text-white hover:bg-gray-700 hover:scale-105'
              }`}
          >
            {t('followingTab')}
          </button>
        </motion.div>
      )}

      <div className="h-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="h-full w-full"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -300, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {user ? (
              <VideoCard
                video={videos[currentIndex]}
                isActive={true}
                autoPlay={true}
                onSwipeUp={() => {
                  const nextIndex = Math.min(currentIndex + 1, videos.length - 1);
                  setCurrentIndex(nextIndex);
                  trackVideoView(nextIndex);
                }}
                onWatchTimeUpdate={handleWatchTimeUpdate}
              />
            ) : (
              <GuestVideoCard
                video={videos[currentIndex]}
                isActive={true}
                autoPlay={true}
                onSwipeUp={() => {
                  const nextIndex = Math.min(currentIndex + 1, videos.length - 1);
                  setCurrentIndex(nextIndex);
                  trackVideoView(nextIndex);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Video Navigation Dots - Responsive */}
        {showNavigation && videos.length > 1 && (
          <motion.div
            className={`fixed z-40 space-y-2 sm:space-y-3 hidden sm:block ${isRTL ? 'left-4 sm:left-6' : 'right-4 sm:right-6'
              } top-1/2 transform -translate-y-1/2`}
            initial={{ x: isRTL ? -50 : 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? -50 : 50, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {videos.slice(0, 20).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  trackVideoView(index);
                  setShowNavigation(true);
                }}
                className={`block w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 transform hover:scale-150 ${index === currentIndex
                  ? 'bg-white shadow-lg'
                  : videoHistory[videos[index]?.id]
                    ? 'bg-gray-400'
                    : 'bg-gray-600'
                  }`}
                title={`Video ${index + 1}${videoHistory[videos[index]?.id] ? ' (Watched)' : ''}`}
              />
            ))}
            {videos.length > 20 && (
              <div className="text-white text-xs text-center bg-black/50 px-2 py-1 rounded-full">
                +{videos.length - 20}
              </div>
            )}
          </motion.div>
        )}

        {/* Video Counter - Responsive */}
        {showNavigation && (
          <motion.div
            className={`absolute top-4 z-40 ${isRTL ? 'right-4 sm:right-auto sm:left-4' : 'left-4 sm:left-auto sm:right-4'
              }`}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-white text-xs sm:text-sm bg-black/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full backdrop-blur-sm border border-white/10 font-medium">
              {t('videoCount', { current: currentIndex + 1, total: videos.length })}
            </span>
          </motion.div>
        )}

        {/* Recommended Badge - Responsive */}
        {activeTab === 'forYou' && user && showNavigation && (
          <motion.div
            className={`absolute bottom-16 sm:bottom-20 z-30 ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'
              }`}
            initial={{ x: isRTL ? 30 : -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 30 : -30, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >

          </motion.div>
        )}

        {/* Progress Bar - Responsive */}
        {showNavigation && videos.length > 1 && (
          <motion.div
            className="absolute bottom-4 left-3 right-3 sm:left-4 sm:right-4 z-30"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-full bg-gray-700/50 rounded-full h-1 sm:h-1.5 backdrop-blur-sm">
              <div
                className="bg-white h-1 sm:h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentIndex + 1) / videos.length) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
<div style={{ fontFamily: 'Tajawal, sans-serif' }}>مرحبا بالعالم</div>
<div style={{ fontFamily: 'Poppins, sans-serif' }}>Hello World</div>

        {/* Mobile Navigation Hint */}
        {!showNavigation && videos.length > 1 && (
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >

          </motion.div>
        )}
      </div>

      {/* Mobile Bottom Navigation Dots */}
      {showNavigation && videos.length > 1 && (
        <motion.div
          className={`fixed bottom-16 z-40 flex space-x-2 sm:hidden ${isRTL ? 'right-4' : 'left-4'
            }`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {videos.slice(0, 10).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                trackVideoView(index);
                setShowNavigation(true);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                ? 'bg-white shadow-lg'
                : videoHistory[videos[index]?.id]
                  ? 'bg-gray-400'
                  : 'bg-gray-600'
                }`}
            />
          ))}
          {videos.length > 10 && (
            <div className="text-white text-xs bg-black/50 px-1.5 rounded-full">
              +{videos.length - 10}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Home;