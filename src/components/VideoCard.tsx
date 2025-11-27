import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBox from './ChatBox';
import CommentsBox from './CommentsBox';
import FloatingChatBar from './FloatingChatBar';
import BroadcastTicker from './BroadcastTicker';
import UploadModal from './UploadModal';
import { Video } from '../types';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { useHLS } from '../hooks/useHLS';
import { useVideoProgress } from '../hooks/useVideoProgress';

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  autoPlay?: boolean;
  onWatchTimeUpdate?: (watchTime: number) => void;
  onSwipeUp?: () => void;
  onInteraction?: (videoId: number, interactionType: string) => void;
  compact?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isActive,
  autoPlay = true,
  onWatchTimeUpdate,
  onSwipeUp,
  onInteraction,
  compact = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(video.is_liked || false);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [commentCount, setCommentCount] = useState(video.comment_count || 0);
  const [shareCount, setShareCount] = useState(video.shares || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // 🚀 VIDEO TURBO ENGINE: HLS Streaming & Progress Tracking
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);
  const [useHlsStreaming, setUseHlsStreaming] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('unknown');

  // استخدام Video Progress Hook للاستئناف التلقائي
  const videoProgressHook = user ? useVideoProgress(videoRef, video.id, user.id) : null;

  // استخدام HLS Hook للتشغيل التدريجي
  const { error: hlsError } = useHLS(videoRef, manifestUrl, {
    autoPlay: isActive,
    onError: (err) => {
      console.log('HLS playback failed, falling back to MP4:', err);
      setUseHlsStreaming(false);
    }
  });

  // ✅ الكشف عن نوع الجهاز
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // ✅ SVG Icons with TikTok style
  const TikTokIcons = {
    like: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    comment: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    ),
    share: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
      </svg>
    ),
    report: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    ),
    mute: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 9H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h2v2c0 1.1.9 2 2 2h1.17l4.9 4.9c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .94-.2 1.82-.54 2.63l1.51 1.51C20.63 15.01 21 13.55 21 12c0-2.76-1.12-5.26-2.93-7.07l-1.06 1.06C19.45 7.53 20 9.66 20 12zm-4.46 3.63l1.45 1.45C17.41 16.97 18 14.56 18 12c0-1.25-.27-2.44-.75-3.51l-1.37 1.37c.26.73.43 1.51.51 2.32.13.34.2.7.2 1.08 0 .42-.09.82-.24 1.19z" />
      </svg>
    ),
    unmute: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
    ),
    music: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    ),
    check: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    )
  };

  // ✅ استخدام useCallback لتحسين الأداء
  const fetchCommentCount = useCallback(async () => {
    try {
      const response = await api.get(`/videos/${video.id}/comments/count`);
      setCommentCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch comment count:', error);
      setCommentCount(video.comment_count || 0);
    }
  }, [video.id, video.comment_count]);

  const fetchShareCount = useCallback(async () => {
    try {
      const response = await api.get(`/videos/${video.id}/shares/count`);
      setShareCount(response.data.shareCount);
    } catch (error) {
      console.error('Failed to fetch share count:', error);
      setShareCount(video.shares || 0);
    }
  }, [video.id, video.shares]);

  const handleNewComment = useCallback(() => {
    setCommentCount(prev => prev + 1);
  }, []);

  const handleDeleteComment = useCallback(() => {
    setCommentCount(prev => Math.max(0, prev - 1));
  }, []);

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const handleOpenUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadModal(true);
    }
    // Reset input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      const playVideo = async () => {
        try {
          videoElement.muted = true;
          setIsMuted(true);
          await videoElement.play();
          setIsPlaying(true);
          setWatchStartTime(Date.now());
        } catch (error) {
          console.log('Auto-play failed:', error);
        }
      };
      playVideo();
    } else {
      videoElement.pause();
      setIsPlaying(false);
      recordWatchTime();
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      recordWatchTime();
    };
  }, []);

  // 🚀 VIDEO TURBO ENGINE: تحميل HLS Manifest
  useEffect(() => {
    const loadManifest = async () => {
      try {
        const response = await api.get(`/videos/${video.id}/manifest`);
        if (response.data.manifestUrl) {
          setProcessingStatus(response.data.processingStatus);
          if (response.data.processingStatus === 'completed') {
            setManifestUrl(response.data.manifestUrl);
            setUseHlsStreaming(true);
            console.log('✅ HLS streaming enabled for video:', video.id);
          } else {
            console.log('⏳ Video still processing, using MP4');
          }
        }
      } catch (error) {
        console.log('ℹ️ HLS not available, using regular MP4');
        setUseHlsStreaming(false);
      }
    };

    if (video.id && isActive) {
      loadManifest();
    }
  }, [video.id, isActive]);

  const recordWatchTime = () => {
    if (watchStartTime && user && totalWatchTime > 0) {
      onWatchTimeUpdate?.(totalWatchTime);

      // 🚀 VIDEO TURBO ENGINE: استخدام Progress Hook للحفظ الفوري
      if (videoProgressHook && videoRef.current) {
        videoProgressHook.saveProgress(true); // حفظ فوري
      } else {
        // Fallback للطريقة القديمة
        api.post('/user/watch-history', {
          videoId: video.id,
          watchTime: totalWatchTime,
          completed: progress >= 80
        }).catch(console.error);
      }
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateProgress = () => {
      const currentTime = videoElement.currentTime;
      const duration = videoElement.duration;
      if (duration > 0) {
        const newProgress = (currentTime / duration) * 100;
        setProgress(newProgress);

        if (watchStartTime) {
          setTotalWatchTime(currentTime);
        }

        if (user && currentTime % 10 < 0.1) {
          onWatchTimeUpdate?.(currentTime);
        }
      }
    };

    videoElement.addEventListener('timeupdate', updateProgress);
    return () => videoElement.removeEventListener('timeupdate', updateProgress);
  }, [watchStartTime, user]);

  useEffect(() => {
    setProgress(0);
    setTotalWatchTime(0);
    setWatchStartTime(null);
  }, [video.id]);

  useEffect(() => {
    if (showComments && video.id) {
      fetchCommentCount();
    }
  }, [showComments, video.id, fetchCommentCount]);

  useEffect(() => {
    if (video.id && isActive) {
      fetchShareCount();
      fetchCommentCount();

      const interval = setInterval(() => {
        fetchShareCount();
        fetchCommentCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [video.id, isActive, fetchShareCount, fetchCommentCount]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    if (diff > 50 && onSwipeUp) {
      onSwipeUp();
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        recordWatchTime();
      } else {
        videoRef.current.play();
        setWatchStartTime(Date.now());
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('يرجى تسجيل الدخول للإعجاب بالفيديوهات');
      return;
    }
    try {
      const oldIsLiked = isLiked;
      const oldLikeCount = likeCount;
      setIsLiked(!oldIsLiked);
      setLikeCount(oldIsLiked ? oldLikeCount - 1 : oldLikeCount + 1);

      const response = await api.post(`/videos/${video.id}/like`);
      setIsLiked(response.data.isLiked);
      setLikeCount(response.data.likes);

      onInteraction?.(video.id, 'like');

      if (!oldIsLiked) {
        api.post('/user/interaction', {
          videoId: video.id,
          type: 'like',
          weight: 1.0
        }).catch(console.error);
      }
    } catch (error: any) {
      console.error('Like action failed:', error);
      setIsLiked(isLiked);
      setLikeCount(likeCount);
      if (error.response?.status === 401) {
        alert('يرجى تسجيل الدخول للإعجاب بالفيديوهات');
      }
    }
  };

  const shareVideo = async () => {
    const videoUrl = `${window.location.origin}/video/${video.id}`;

    try {
      await navigator.clipboard.writeText(videoUrl);
      alert('تم نسخ رابط الفيديو!');
      setShowShareMenu(false);

      if (user) {
        try {
          const response = await api.post(`/videos/${video.id}/share`, {
            shareMethod: 'direct'
          });
          setShareCount(response.data.shareCount);
          onInteraction?.(video.id, 'share');
        } catch (shareError) {
          console.error('Failed to record share:', shareError);
        }
      }
    } catch (copyError) {
      const textArea = document.createElement('textarea');
      textArea.value = videoUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('تم نسخ رابط الفيديو!');
      setShowShareMenu(false);
    }
  };

  const shareOnSocialMedia = async (platform: string) => {
    const videoUrl = `${window.location.origin}/video/${video.id}`;
    const text = `شاهد هذا الفيديو الرائع!`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(videoUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + videoUrl)}`
    };

    window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400');
    setShowShareMenu(false);

    if (user) {
      try {
        const response = await api.post(`/videos/${video.id}/share`, {
          shareMethod: platform
        });
        setShareCount(response.data.shareCount);
        onInteraction?.(video.id, 'share');
      } catch (shareError) {
        console.error('Failed to record social share:', shareError);
      }
    }
  };

  const reportVideo = async (reason: string) => {
    if (!user) {
      alert('يرجى تسجيل الدخول للإبلاغ عن الفيديوهات');
      return;
    }

    if (user.id === video.user_id) {
      alert('لا يمكنك الإبلاغ عن الفيديو الخاص بك');
      setShowReportMenu(false);
      return;
    }

    setIsReporting(true);
    try {
      await reportService.createReport(video.id, reason);
      setReportSuccess(true);

      api.post('/user/interaction', {
        videoId: video.id,
        type: 'report',
        weight: -2.0
      }).catch(console.error);

      setTimeout(() => {
        setReportSuccess(false);
        setShowReportMenu(false);
      }, 2000);
    } catch (error: any) {
      console.error('Report failed:', error);
      if (error.response?.status === 400) {
        alert('لقد أبلغت عن هذا الفيديو مسبقاً');
      } else if (error.response?.status === 401) {
        alert('يرجى تسجيل الدخول للإبلاغ عن الفيديوهات');
      } else {
        alert('فشل في الإبلاغ عن الفيديو. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsReporting(false);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    if (e.target === videoRef.current) {
      togglePlay();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest('.share-menu') && !target.closest('.share-button')) {
        setShowShareMenu(false);
      }

      if (!target.closest('.report-menu') && !target.closest('.report-button')) {
        setShowReportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ عرض مضغوط للبحث
  if (compact) {
    return (
      <div className="flex bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="relative w-40 h-24 flex-shrink-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted={true}
            playsInline
            preload="metadata"
          >
            <source src={`${import.meta.env.VITE_API_URL}${video.path}`} type="video/mp4" />
          </video>
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
            2:30
          </div>
        </div>

        <div className="flex-1 p-3">
          <Link to={`/video/${video.id}`}>
            <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1 hover:text-red-500 transition-colors">
              {video.description || 'فيديو بدون عنوان'}
            </h3>
          </Link>
          <Link to={`/profile/${video.username}`}>
            <p className="text-gray-400 text-xs hover:text-white transition-colors">
              @{video.username}
            </p>
          </Link>
          <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
            <span>{video.views || 0} مشاهدة</span>
            <span>{likeCount} إعجاب</span>
            <span>{shareCount} مشاركة</span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ الهيكل الرئيسي للفيديو مع دعم متعدد الأجهزة
  const renderVideoContent = () => (
    <>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="video/*"
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* Video Player */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isMobile ? '' : 'iphone-video'}`}
        style={{ aspectRatio: '9/16' }}
        loop
        muted={isMuted}
        playsInline
        onClick={handleVideoClick}
        preload="auto"
      >
        {/* 🚀 VIDEO TURBO ENGINE: استخدام HLS إذا كان متاحاً، وإلا استخدام MP4 العادي */}
        {!useHlsStreaming && (
          <source src={`${import.meta.env.VITE_API_URL}${video.path}`} type="video/mp4" />
        )}
        Your browser does not support the video tag.
      </video>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-600 z-30">
        <div
          className="h-full bg-white transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* شريط الدردشة العائم */}
      <FloatingChatBar
        onOpenChat={toggleChat}
        onOpenUpload={handleOpenUpload}
        isVideoOwner={video.user_id === user?.id}
        hasUploadedBefore={false}
        currentVideoId={video.id}
      />

      {/* شريط البث المتحرك */}
      <BroadcastTicker />

      {/* أزرار التفاعل على الجانب الأيسر */}
      <div
        className={`fixed ${isMobile ? 'left-8' : 'left-122'} bottom-1/4 transform translate-y-1/4 z-20 flex flex-col items-center space-y-3`}
        style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}
      >

        {/* Profile Image */}
        <div className="flex flex-col items-center">
          <Link to={`/profile/${video.username}`}>
            <img
              src={video.avatar ? `${import.meta.env.VITE_API_URL}${video.avatar}` : "/default-avatar.png"}
              className="w-12 h-12 rounded-full object-cover border-2 border-white mb-1 hover:border-red-500 transition-all duration-200 shadow-lg hover:shadow-red-500/20"
              alt={video.username}
              onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
            />
          </Link>
          <span className="text-[10px] font-bold text-white mb-2 drop-shadow-md">Nojoom</span>
          <Link to={`/profile/${video.username}`}>
            <div className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-red-600 transition-all duration-200 active:scale-95 shadow-lg">
              <span className="text-white text-sm">Follow</span>
            </div>
          </Link>
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLike}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-red-500/20 transition-all duration-200 active:scale-110 shadow-lg"
          >
            <span className={`${isLiked ? 'text-red-500' : 'text-white'}`}>
              {TikTokIcons.like}
            </span>
          </button>
          <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full drop-shadow-md">
            {likeCount}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={toggleComments}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-blue-500/20 transition-all duration-200 active:scale-110 shadow-lg"
          >
            <span className="text-white">{TikTokIcons.comment}</span>
          </button>
          <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full drop-shadow-md">
            {commentCount}
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-green-500/20 transition-all duration-200 active:scale-110 shadow-lg share-button"
          >
            <span className="text-white">{TikTokIcons.share}</span>
          </button>
          <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full drop-shadow-md">
            {shareCount}
          </span>
        </div>

        {/* Report Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setShowReportMenu(!showReportMenu)}
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all duration-200 active:scale-110 shadow-lg report-button ${reportSuccess ? 'bg-green-500/50' : 'bg-black/30 hover:bg-yellow-500/20'
              }`}
            disabled={isReporting}
          >
            <span className={`${reportSuccess ? 'text-green-400' : 'text-white'}`}>
              {reportSuccess ? TikTokIcons.check : TikTokIcons.report}
            </span>
          </button>
          <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full drop-shadow-md">
            {reportSuccess ? 'تم الإبلاغ!' : 'الإبلاغ'}
          </span>
        </div>

        {/* Sound Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={toggleMute}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-gray-500/20 transition-all duration-200 active:scale-110 shadow-lg"
          >
            <span className="text-white">{isMuted ? TikTokIcons.mute : TikTokIcons.unmute}</span>
          </button>
        </div>

      </div>

      {/* معلومات الفيديو على الجانب الأيمن */}
      <div className={`absolute ${isMobile ? 'bottom-20 right-4' : 'bottom-24 right-6'} z-20 text-right max-w-xs flex flex-col gap-3`}>

        {/* Profile + Username */}
        <div className="flex items-center justify-end gap-3 mb-2">
          <div className="flex flex-col items-end">
            <Link to={`/profile/${video.username}`} className="hover:underline">
              <h3 className="text-white font-bold text-base leading-none">{video.username}</h3>
            </Link>
          </div>
        </div>

        {/* Video Description Ticker */}
        <div className="w-full overflow-hidden relative h-6 mb-1">
          <div className="absolute whitespace-nowrap animate-marquee-rtl">
            <p className="text-white text-sm font-medium inline-block">
              {video.description}
            </p>
          </div>
        </div>

      </div>
    </>
  );

  // ✅ العرض النهائي بناءً على نوع الجهاز
  return (
    <div
      className={`relative bg-black flex items-center justify-center ${isMobile
        ? 'w-full h-screen video-fullscreen'
        : 'w-full h-screen'
        }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isMobile ? (
        // ✅ عرض الجوال - ملء الشاشة بالكامل
        <div className="relative w-full h-full">
          {renderVideoContent()}
        </div>
      ) : (
        // ✅ عرض الكمبيوتر - إطار iPhone
        <div className="iphone-frame">
          <div className="iphone-content">
            {renderVideoContent()}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && selectedFile && (
          <UploadModal
            isOpen={showUploadModal}
            onClose={() => {
              setShowUploadModal(false);
              setSelectedFile(null);
            }}
            file={selectedFile}
            onUploadSuccess={() => {
              setShowUploadModal(false);
              setSelectedFile(null);
              // Optional: Refresh feed or show notification
              alert('Video uploaded successfully! It will appear in your profile shortly.');
            }}
            isVideoOwner={video.user_id === user?.id}
            currentVideoId={video.id}
          />
        )}
      </AnimatePresence>

      {/* Share Menu */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            className={`absolute bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-30 share-menu min-w-48 border border-white/10 ${isMobile ? 'left-16 bottom-64' : 'left-20 bottom-72'
              }`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-white font-semibold mb-3 text-center">مشاركة الفيديو</h3>
            <div className="space-y-2">
              <button
                onClick={shareVideo}
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-700/50 rounded-lg flex items-center space-x-3 text-sm transition-all duration-200 active:scale-105"
              >
                <span className="text-xl">🔗</span>
                <span>نسخ الرابط</span>
              </button>
              <button
                onClick={() => shareOnSocialMedia('twitter')}
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-700/50 rounded-lg flex items-center space-x-3 text-sm transition-all duration-200 active:scale-105"
              >
                <span className="text-xl">🐦</span>
                <span>تويتر</span>
              </button>
              <button
                onClick={() => shareOnSocialMedia('facebook')}
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-700/50 rounded-lg flex items-center space-x-3 text-sm transition-all duration-200 active:scale-105"
              >
                <span className="text-xl">📘</span>
                <span>فيسبوك</span>
              </button>
              <button
                onClick={() => shareOnSocialMedia('whatsapp')}
                className="w-full text-left px-4 py-3 text-white hover:bg-gray-700/50 rounded-lg flex items-center space-x-3 text-sm transition-all duration-200 active:scale-105"
              >
                <span className="text-xl">💚</span>
                <span>واتساب</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Menu */}
      <AnimatePresence>
        {showReportMenu && (
          <motion.div
            className={`absolute bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-30 report-menu w-56 border border-white/10 ${isMobile ? 'left-16 bottom-64' : 'left-20 bottom-72'
              }`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-white font-semibold mb-3 text-center">الإبلاغ عن الفيديو</h3>
            <div className="space-y-1">
              {['مضايقة', 'عنف', 'خطاب كراهية', 'بريد مزعج', 'محتوى عاري', 'أخرى'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => reportVideo(reason)}
                  disabled={isReporting}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-700/50 rounded-lg text-sm transition-all duration-200 active:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReporting ? 'جاري الإبلاغ...' : reason}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Box */}
      <CommentsBox
        videoId={video.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentAdded={handleNewComment}
        onCommentDeleted={handleDeleteComment}
      />

      {/* Chat Box */}
      <AnimatePresence>
        {showChat && isActive && (
          <motion.div
            className={`absolute top-0 right-0 bottom-0 z-30 ${isMobile ? 'w-full' : 'w-80'
              }`}
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`h-full bg-black border-l border-gray-700 ${isMobile ? 'rounded-none' : 'rounded-r-2xl'
              }`}>
              <ChatBox
                videoId={video.id}
                videoOwnerId={video.user_id}
                isVideoOwner={video.user_id === user?.id}
                onClose={() => setShowChat(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {reportSuccess && (
          <motion.div
            className={`absolute bg-green-500 text-white px-4 py-2 rounded-lg shadow-2xl z-40 border border-green-400 ${isMobile ? 'top-20 left-4' : 'top-8 left-8'
              }`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <span>{TikTokIcons.check}</span>
              <span>تم الإبلاغ عن الفيديو بنجاح!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoCard;