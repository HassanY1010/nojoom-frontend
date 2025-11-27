// src/components/VideoPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import ChatBox from './ChatBox';
import FloatingChatBar from './FloatingChatBar';
import BroadcastTicker from './BroadcastTicker';
import UploadModal from './UploadModal';
import useVideoTimer from '../hooks/useVideoTimer';
import { useAuth } from '../context/AuthContext';

interface VideoPlayerProps {
  video?: {
    id: number;
    url: string;
    title: string;
    description?: string;
    owner: {
      id: number;
      username: string;
      avatar?: string;
    };
    views?: number;
    likes?: number;
    created_at?: string;
  };
  onSwipeUp?: () => void;
  isActive?: boolean;
  currentUser?: {
    id: number;
    username: string;
  };
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  video, 
  onSwipeUp, 
  isActive = true,
  currentUser 
}) => {
  // ✅ التحقق من وجود video object
  const [showChat, setShowChat] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [systemPaused, setSystemPaused] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasUploadedBefore, setHasUploadedBefore] = useState(false);
  
  // ✅ تهيئة videoStats بشكل آمن
  const [videoStats, setVideoStats] = useState({
    views: video?.views || 0,
    likes: video?.likes || 0
  });
  
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const touchStartY = useRef(0);
  const { user } = useAuth();

  // ✅ التحقق من undefined قبل الوصول إلى الخصائص
  const isVideoOwner = currentUser?.id === video?.owner?.id;

  // ✅ تحديث videoStats عندما يتغير video
  useEffect(() => {
    if (video) {
      setVideoStats({
        views: video.views || 0,
        likes: video.likes || 0
      });
    }
  }, [video]);

  const handleTimeLimitReached = () => {
    setSystemPaused(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
  };

  // ✅ استخدام video?.id بشكل آمن مع قيمة افتراضية
  const { 
    watchTime, 
    isPausedBySystem, 
    resetTimer, 
    forceContinue,
    remainingTime 
  } = useVideoTimer(video?.id || 0, isActive && isPlaying, handleTimeLimitReached);

  useEffect(() => {
    setSystemPaused(isPausedBySystem);
  }, [isPausedBySystem]);

  // إظهار/إخفاء عناصر التحكم تلقائياً
  useEffect(() => {
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setShowControls(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (diff > 50 && onSwipeUp) {
      onSwipeUp();
    }
  };

  const handleVideoClick = () => {
    setShowControls(true);
    togglePlay();
  };

  const togglePlay = () => {
    if (systemPaused) return;
    
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleReload = () => {
    resetTimer();
    setSystemPaused(false);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(console.error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // التحقق من نوع الملف
      const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid video file (MP4, WebM, or OGG)');
        return;
      }

      // التحقق من حجم الملف (50MB كحد أقصى)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }

      setSelectedFile(file);
      setShowUploadModal(true);
    }
  };

  const handleUploadSuccess = () => {
    setHasUploadedBefore(true);
    // إعادة تحميل الصفحة لتحديث الفيديو
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handleLike = async () => {
    try {
      // هنا يمكنك إضافة API call للإعجاب
      setVideoStats(prev => ({
        ...prev,
        likes: prev.likes + 1
      }));
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
  };

  // ✅ عرض حالة التحميل أو عدم وجود فيديو
  if (!video) {
    return (
      <div className="relative h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">📹</div>
          <h3 className="text-xl font-bold">No Video Available</h3>
          <p className="text-gray-400 mt-2">Please select a valid video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black">
      {/* شريط البث المباشر */}
      <BroadcastTicker />
      
      {/* منطقة الفيديو بنسبة 16:9 */}
      <div 
        className={`relative ${showChat ? 'h-2/3' : 'h-full'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setShowControls(true)}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-cover cursor-pointer"
          autoPlay={isPlaying && !systemPaused}
          loop
          muted={isMuted}
          playsInline
          onClick={handleVideoClick}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Overlay controls */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* معلومات الفيديو */}
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-xl font-bold drop-shadow-lg">{video.title}</h2>
            <div className="flex items-center space-x-2 mt-1">
              {/* ✅ التحقق من وجود video.owner */}
              <p className="text-gray-200">@{video.owner?.username || 'Unknown'}</p>
              {isVideoOwner && (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  🎬 Owner
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-300">
              <span>{formatViews(videoStats.views)} views</span>
              <span>{formatViews(videoStats.likes)} likes</span>
            </div>
            
            {/* مؤشر الوقت المتبقي */}
            {!systemPaused && remainingTime > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <p className="text-xs text-yellow-300">
                  Time remaining: {formatTime(remainingTime)}
                </p>
              </div>
            )}
          </div>
          
          {/* عناصر التحكم العلوية */}
          <div className="absolute top-4 right-4 flex space-x-3">
            <button
              onClick={() => setShowChat(!showChat)}
              className="bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-110"
              disabled={systemPaused}
            >
              {showChat ? '💬' : '📱'}
            </button>
            <button
              onClick={togglePlay}
              className="bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-110"
              disabled={systemPaused}
            >
              {systemPaused ? '⏸️' : (isPlaying ? '⏸️' : '▶️')}
            </button>
            <button
              onClick={toggleMute}
              className="bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-110"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>

          {/* زر الإعجاب */}
          <div className="absolute bottom-20 right-4 flex flex-col items-center space-y-3">
            <button
              onClick={handleLike}
              className="bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-110 flex flex-col items-center"
            >
              <span className="text-lg">❤️</span>
              <span className="text-xs mt-1">{formatViews(videoStats.likes)}</span>
            </button>
          </div>

          {/* عناصر التحكم المركزية */}
          {!isPlaying && !systemPaused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="bg-black/50 text-white p-6 rounded-full hover:bg-black/70 transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-110 text-2xl"
              >
                ▶️
              </button>
            </div>
          )}
        </div>

        {/* نافذة التوقف النظامي */}
        {systemPaused && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900/90 p-8 rounded-3xl max-w-sm mx-4 text-center border border-gray-700/50 backdrop-blur-sm">
              <div className="text-5xl mb-6">⏰</div>
              <h3 className="text-white text-2xl font-bold mb-4">Time Limit Reached</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                You've been watching this video for over 3 hours. Please take a break or watch other videos.
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleReload}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-2xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  🔄 Reload Video
                </button>
                {onSwipeUp && (
                  <button
                    onClick={onSwipeUp}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    ⏭️ Watch Next Video
                  </button>
                )}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={forceContinue}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 rounded-2xl font-bold hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                  >
                    🚀 Continue Anyway (Dev)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Swipe up indicator */}
        {onSwipeUp && !systemPaused && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center">
            <div className="animate-bounce text-2xl mb-2">⬆️</div>
            <p className="text-sm text-gray-300 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
              Swipe up for next video
            </p>
          </div>
        )}
      </div>

      {/* منطقة الدردشة */}
      {showChat && (
        <div className="h-1/3 border-t border-gray-700/50">
          <ChatBox 
            videoId={video.id}
            videoOwnerId={video.owner?.id || 0}
            isVideoOwner={isVideoOwner}
            onClose={() => setShowChat(false)}
            isPaused={systemPaused}
          />
        </div>
      )}

      {/* زر الدردشة العائم */}
      <FloatingChatBar 
        onOpenChat={() => setShowChat(true)}
        onOpenUpload={() => document.getElementById('video-upload')?.click()}
        isVideoOwner={isVideoOwner}
        hasUploadedBefore={hasUploadedBefore}
        currentVideoId={video.id}
      />

      {/* ملف خفي لرفع الفيديو */}
      <input
        id="video-upload"
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* نافذة رفع الفيديو */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        file={selectedFile}
        onUploadSuccess={handleUploadSuccess}
        isVideoOwner={isVideoOwner}
        currentVideoId={video.id}
      />
    </div>
  );
};

export default VideoPlayer;