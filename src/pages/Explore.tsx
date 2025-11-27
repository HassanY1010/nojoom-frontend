import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { exploreApi } from '../services/api';
import VideoCard from '../components/VideoCard';
import UserCard from '../components/UserCard';
import SearchBar from '../components/SearchBar';
import BroadcastTicker from '../components/BroadcastTicker';
import { Video, User } from '../types';

type ContentType = 'videos' | 'users';
type FilterType = 'recommended' | 'trending' | 'popular' | 'latest';

const Explore: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ContentType>('videos');
  const [activeFilter, setActiveFilter] = useState<FilterType>('recommended');
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // جلب الفيديوهات
  const fetchVideos = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await exploreApi.getExploreVideos({
        page: pageNum,
        filter: activeFilter,
        search: searchQuery || undefined,
        userId: user?.id
      });

      const newVideos = response.data.videos || response.data.data || [];
      
      if (isRefresh) {
        setVideos(newVideos);
      } else {
        setVideos(prev => [...prev, ...newVideos]);
      }
      
      setHasMore(newVideos.length > 0 && newVideos.length >= 10);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch videos:', err);
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, user, loading]);

  // جلب المستخدمين
  const fetchUsers = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await exploreApi.getExploreUsers({
        page: pageNum,
        search: searchQuery || undefined,
        userId: user?.id
      });

      const newUsers = response.data.users || response.data.data || [];
      
      if (isRefresh) {
        setUsers(newUsers);
      } else {
        setUsers(prev => [...prev, ...newUsers]);
      }
      
      setHasMore(newUsers.length > 0 && newUsers.length >= 10);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user, loading]);

  // البحث
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
    setVideos([]);
    setUsers([]);
  }, []);

  // تغيير التبويب
  const handleTabChange = (tab: ContentType) => {
    setActiveTab(tab);
    setPage(1);
    setVideos([]);
    setUsers([]);
  };

  // تغيير الفلتر
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    setPage(1);
    setVideos([]);
  };

  // Infinite Scroll
  const handleScroll = useCallback(() => {
    if (loading || !hasMore) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - 100) {
      if (activeTab === 'videos') {
        fetchVideos(page + 1);
      } else {
        fetchUsers(page + 1);
      }
    }
  }, [loading, hasMore, page, activeTab, fetchVideos, fetchUsers]);

  // تحديث التفاعلات
  const handleFollowChange = (userId: number, isFollowing: boolean) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { ...user, is_following: isFollowing } 
          : user
      )
    );
  };

  const handleInteraction = (videoId: number, interactionType: string) => {
    if (interactionType === 'like') {
      setVideos(prev =>
        prev.map(video =>
          video.id === videoId
            ? { 
                ...video, 
                is_liked: !video.is_liked,
                likes: video.is_liked ? (video.likes || 1) - 1 : (video.likes || 0) + 1
              }
            : video
        )
      );
    }
  };

  // التحميل الأولي
  useEffect(() => {
    if (activeTab === 'videos') {
      fetchVideos(1, true);
    } else {
      fetchUsers(1, true);
    }
  }, [activeTab, activeFilter, searchQuery]);

  // إضافة event listener للـ scroll
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-black pt-16">
      {/* شريط البث المتحرك */}
      <BroadcastTicker />

      {/* شريط البحث */}
      <div className="sticky top-16 z-30 bg-black border-b border-gray-800 px-3 sm:px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <SearchBar
            query={searchQuery}
            onQueryChange={handleSearch}
            onSearch={() => {
              if (activeTab === 'videos') {
                fetchVideos(1, true);
              } else {
                fetchUsers(1, true);
              }
            }}
            placeholder="Search videos, users, or hashtags..."
            darkMode={true}
            compact={true}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {/* التبويبات الرئيسية */}
        <div className="flex border-b border-gray-800 mb-4 sm:mb-6">
          {(['videos', 'users'] as ContentType[]).map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === 'videos' ? 'Videos' : 'Creators'}
            </button>
          ))}
        </div>
      
        {/* فلاتر الفيديوهات */}
        {activeTab === 'videos' && (
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6">
            {(['recommended', 'trending', 'popular', 'latest'] as FilterType[]).map((filter) => (
              <button
                key={filter}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
                  activeFilter === filter
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                }`}
                onClick={() => handleFilterChange(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* عرض المحتوى */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>⚠️</span>
                <span className="text-sm sm:text-base">{error}</span>
              </div>
              <button 
                onClick={() => activeTab === 'videos' ? fetchVideos(1, true) : fetchUsers(1, true)}
                className="text-red-300 hover:text-white underline text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {activeTab === 'videos' ? (
          <div className="space-y-3 sm:space-y-4">
            {videos.map((video, index) => (
              <div key={`${video.id}-${index}`} className="bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden">
                <VideoCard
                  video={video}
                  isActive={false}
                  onInteraction={handleInteraction}
                  compact={true}
                  tiktokStyle={true}
                  showUserInfo={true}
                />
              </div>
            ))}
            
            {videos.length === 0 && !loading && (
              <div className="text-center py-8 sm:py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">🎬</span>
                </div>
                <div className="text-gray-400 text-base sm:text-lg mb-1 sm:mb-2">No videos found</div>
                <div className="text-gray-500 text-xs sm:text-sm">
                  {searchQuery ? 'Try a different search term' : 'Check back later for new content'}
                </div>
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {users.map((user) => (
              <div key={user.id} className="bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden">
                <UserCard
                  user={user}
                  onFollowChange={handleFollowChange}
                  tiktokStyle={true}
                  compact={true}
                />
              </div>
            ))}
            
            {users.length === 0 && !loading && (
              <div className="col-span-full text-center py-8 sm:py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">👥</span>
                </div>
                <div className="text-gray-400 text-base sm:text-lg mb-1 sm:mb-2">No creators found</div>
                <div className="text-gray-500 text-xs sm:text-sm">
                  {searchQuery ? 'Try a different search term' : 'No suggested creators at the moment'}
                </div>
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* مؤشر التحميل */}
        {loading && (
          <div className="flex justify-center py-6 sm:py-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-white"></div>
              <span className="text-gray-400 text-xs sm:text-sm">Loading more content...</span>
            </div>
          </div>
        )}

        {/* رسالة نهاية المحتوى */}
        {!hasMore && (videos.length > 0 || users.length > 0) && (
          <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm border-t border-gray-800 mt-4">
            <div className="flex items-center justify-center space-x-2">
              <span>✨</span>
              <span>You've reached the end of the content</span>
              <span>✨</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">
              Come back later for more amazing content
            </p>
          </div>
        )}

        {/* زر العودة للأعلى */}
        {(videos.length > 5 || users.length > 8) && (
          <div className="fixed bottom-6 right-4 sm:right-6 z-40">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;