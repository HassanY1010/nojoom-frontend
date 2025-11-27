import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { searchService } from '../services/searchService';
import VideoCard from '../components/VideoCard';
import UserCard from '../components/UserCard';
import SearchBar from '../components/SearchBar';
import { Video, User } from '../types';

type SearchType = 'all' | 'videos' | 'users';
type FilterType = 'relevance' | 'trending' | 'latest' | 'hashtags';

const Search: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [filterType, setFilterType] = useState<FilterType>('relevance');
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

  // البحث مع debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        clearResults();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchType, filterType]);

  const handleSearch = async (resetPage: boolean = true) => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const currentPage = resetPage ? 1 : page;

      const response = await searchService.search({
        query: searchQuery,
        type: searchType,
        filter: filterType,
        page: currentPage,
        limit: 10
      });

      if (resetPage) {
        setVideos(response.videos || []);
        setUsers(response.users || []);
        setHashtags(response.hashtags || []);
        setPage(1);
      } else {
        setVideos(prev => [...prev, ...(response.videos || [])]);
        setUsers(prev => [...prev, ...(response.users || [])]);
      }

      setHasMore(response.hasMore || false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setVideos([]);
    setUsers([]);
    setHashtags([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  };

  const loadMore = () => {
    if (!loading && hasMore && searchQuery.trim()) {
      setPage(prev => prev + 1);
      handleSearch(false);
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    setSearchQuery(hashtag);
    setFilterType('hashtags');
  };

  const handleVideoInteraction = useCallback((videoId: number, interactionType: string) => {
    // تحديث حالة الفيديو المحلي بناءً على التفاعل
    if (interactionType === 'like') {
      setVideos(prev => prev.map(video =>
        video.id === videoId
          ? {
            ...video,
            is_liked: !video.is_liked,
            likes: video.is_liked ? video.likes - 1 : video.likes + 1
          }
          : video
      ));
    }
  }, []);

  const handleUserFollow = useCallback((userId: number, isFollowing: boolean) => {
    setUsers(prev => prev.map(user =>
      user.id === userId
        ? {
          ...user,
          is_following: isFollowing,
          followers_count: isFollowing
            ? user.followers_count + 1
            : Math.max(0, user.followers_count - 1)
        }
        : user
    ));
  }, []);

  const handleSwipeUp = (videoId: number) => {
    const currentIndex = videos.findIndex(video => video.id === videoId);
    if (currentIndex < videos.length - 1) {
      setActiveVideoId(videos[currentIndex + 1].id);
    }
  };

  return (
    <div className={`min-h-screen bg-black text-white pt-16 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* شريط البحث */}
        <div className="mb-4 sm:mb-6">
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSearch={() => handleSearch(true)}
          />
        </div>

        {/* أنواع البحث */}
        <div className={`flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          {(['all', 'videos', 'users'] as SearchType[]).map(type => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${searchType === type
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
            >
              {t(`searchPage.${type}`)}
            </button>
          ))}
        </div>

        {/* الفلاتر */}
        {searchType !== 'users' && (
          <div className={`flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {(['relevance', 'trending', 'latest', 'hashtags'] as FilterType[]).map(filter => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${filterType === filter
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
              >
                {t(`searchPage.${filter}`)}
              </button>
            ))}
          </div>
        )}

        {/* الهاشتاجات المقترحة */}
        {hashtags.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h3 className="text-white text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-center sm:text-right">
              {t('searchPage.popularHashtags')}
            </h3>
            <div className={`flex flex-wrap gap-1 sm:gap-2 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              {hashtags.slice(0, 8).map(hashtag => (
                <button
                  key={hashtag}
                  onClick={() => handleHashtagClick(hashtag)}
                  className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-800 text-blue-400 rounded-full text-xs sm:text-sm hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                  #{hashtag}
                </button>
              ))}
              {hashtags.length > 8 && (
                <span className="text-gray-400 text-xs sm:text-sm px-2 py-1">
                  +{hashtags.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* رسالة الخطأ */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span>⚠️</span>
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          </div>
        )}

        {/* النتائج */}
        <div className="space-y-4 sm:space-y-6">
          {/* عرض المستخدمين */}
          {searchType !== 'videos' && users.length > 0 && (
            <div>
              <h2 className="text-white text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-center sm:text-right">
                {t('searchPage.users')} <span className="text-gray-400 text-sm">({users.length})</span>
              </h2>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {users.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onFollowChange={handleUserFollow}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* عرض الفيديوهات */}
          {searchType !== 'users' && videos.length > 0 && (
            <div>
              <h2 className="text-white text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-center sm:text-right">
                {t('searchPage.videos')} <span className="text-gray-400 text-sm">({videos.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {videos.map(video => (
                  <div key={video.id} className="bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <VideoCard
                      video={video}
                      isActive={activeVideoId === video.id}
                      onWatchTimeUpdate={(watchTime) => {
                        // تسجيل وقت المشاهدة للتوصيات
                        searchService.recordInteraction({
                          videoId: video.id,
                          type: 'watch',
                          weight: Math.min(watchTime / 60, 1.0), // وزن بناءً على دقائق المشاهدة
                          metadata: { searchQuery, filterType }
                        }).catch(console.error);
                      }}
                      onSwipeUp={() => handleSwipeUp(video.id)}
                      onInteraction={handleVideoInteraction}
                      compact={true}
                      showStats={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* لا توجد نتائج */}
          {!loading && searchQuery && videos.length === 0 && users.length === 0 && (
            <div className="text-center text-gray-400 py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">🔍</span>
              </div>
              <p className="text-base sm:text-lg mb-1 sm:mb-2">{t('searchPage.noResults')}</p>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto px-4">
                {t('searchPage.tryDifferentKeywords')}
              </p>
              <div className="mt-4 sm:mt-6">
                <button
                  onClick={clearResults}
                  className="px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                >
                  {t('searchPage.clearSearch')}
                </button>
              </div>
            </div>
          )}

          {/* حالة البحث الأولي */}
          {!searchQuery && !loading && (
            <div className="text-center text-gray-400 py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">🎬</span>
              </div>
              <p className="text-base sm:text-lg mb-1 sm:mb-2">{t('searchPage.startSearching')}</p>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto px-4">
                {t('searchPage.searchHint')}
              </p>
            </div>
          )}

          {/* تحميل المزيد */}
          {hasMore && (videos.length > 0 || users.length > 0) && (
            <div className="text-center pt-4 sm:pt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 sm:px-8 sm:py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('searchPage.loading')}</span>
                  </div>
                ) : (
                  t('searchPage.loadMore')
                )}
              </button>
            </div>
          )}

          {/* تحميل أولي */}
          {loading && page === 1 && (
            <div className="text-center text-gray-400 py-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm sm:text-base">{t('searchPage.searching')}</span>
              </div>
            </div>
          )}

          {/* نهاية النتائج */}
          {!hasMore && (videos.length > 0 || users.length > 0) && (
            <div className="text-center text-gray-500 py-4 sm:py-6 border-t border-gray-800">
              <p className="text-xs sm:text-sm">{t('searchPage.endOfResults')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;