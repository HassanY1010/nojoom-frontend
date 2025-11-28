import React, { useRef, useState, useEffect } from 'react';
import { Video } from '../types';

interface GuestVideoCardProps {
  video: Video;
  isActive: boolean;
  onSwipeUp?: () => void;
  autoPlay?: boolean; // ✅ أضفها كخيار اختياري
}


const GuestVideoCard: React.FC<GuestVideoCardProps> = ({ 
  video, 
  isActive,
  onSwipeUp
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ الكشف عن نوع الجهاز
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

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
        } catch (error) {
          console.log('Auto-play failed:', error);
        }
      };

      playVideo();
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

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
      } else {
        videoRef.current.play();
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

  const handleVideoClick = (e: React.MouseEvent) => {
    if (e.target === videoRef.current) {
      togglePlay();
    }
  };

  // ✅ SVG Icons with TikTok style
  const TikTokIcons = {
    like: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
    comment: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    ),
    share: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
      </svg>
    ),
    music: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
    ),
    mute: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 9H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h2v2c0 1.1.9 2 2 2h1.17l4.9 4.9c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .94-.2 1.82-.54 2.63l1.51 1.51C20.63 15.01 21 13.55 21 12c0-2.76-1.12-5.26-2.93-7.07l-1.06 1.06C19.45 7.53 20 9.66 20 12zm-4.46 3.63l1.45 1.45C17.41 16.97 18 14.56 18 12c0-1.25-.27-2.44-.75-3.51l-1.37 1.37c.26.73.43 1.51.51 2.32.13.34.2.7.2 1.08 0 .42-.09.82-.24 1.19z"/>
      </svg>
    ),
    unmute: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
    )
  };

  // ✅ الهيكل الرئيسي للفيديو
  const renderVideoContent = () => (
    <>
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
        <source src={`${import.meta.env.VITE_API_URL}${video.path}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Side Action Buttons */}
     <div
  className={`fixed ${isMobile ? 'left-8' : 'left-122'} bottom-1/4 transform translate-y-1/4 z-20 flex flex-col items-center space-y-3`}
  style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }} 
>

        {/* Profile Avatar */}
        <div className="flex flex-col items-center">
          <div
            onClick={() => window.location.href = "/register"}
            className="cursor-pointer"
          >
            <img
              src={video.avatar ? `${import.meta.env.VITE_API_URL}${video.avatar}` : "/default-avatar.png"}
              className="w-12 h-12 rounded-full object-cover border-2 border-white mb-2 hover:border-red-500 transition-colors duration-200 shadow-lg"
              alt={video.username}
              onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
            />
          </div>
          <button
            onClick={() => window.location.href = "/register"}
            className="mt-2 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-red-600 transition active:scale-95 shadow-lg"
          >
            Follow
          </button>
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => window.location.href = '/register'}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-red-500/20 transition-all duration-200 active:scale-110 shadow-lg"
          >
            <span className="text-white">{TikTokIcons.like}</span>
          </button>
          <span className="text-white text-xs font-medium drop-shadow-md">
            {video.likes?.toLocaleString() || '0'}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => window.location.href = '/register'}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-blue-500/20 transition-all duration-200 active:scale-110 shadow-lg"
          >
            <span className="text-white">{TikTokIcons.comment}</span>
          </button>
          <span className="text-white text-xs font-medium drop-shadow-md">
            {video.comment_count?.toLocaleString() || '0'}
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => window.location.href = '/register'}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-green-500/20 transition-all duration-200 active:scale-110 shadow-lg"
          >
            <span className="text-white">{TikTokIcons.share}</span>
          </button>
          <span className="text-white text-xs font-medium drop-shadow-md">
            {video.shares?.toLocaleString() || '0'}
          </span>
        </div>

        {/* Mute Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={toggleMute}
            className="w-12 h-12 bg-black/30 rounded-full flex items-center justify-center mb-1 hover:bg-gray-500/20 transition-all duration-200 active:scale-110 shadow-lg"
          >
            <span className="text-white">{isMuted ? TikTokIcons.mute : TikTokIcons.unmute}</span>
          </button>
        </div>
      </div>

      {/* VIDEO INFO */}
      <div className={`absolute bottom-20 ${isMobile ? 'right-4' : 'right-6'} text-right`}>
        <div className="mb-2">
          <h3
            className="text-white font-semibold text-lg cursor-pointer"
            onClick={() => window.location.href = '/register'}
          >
            @{video.username}
          </h3>

          <p className="text-white text-sm mt-1">{video.description}</p>
        </div>
      </div>
    </>
  );

  return (
    <div 
      className={`relative bg-black flex items-center justify-center ${
        isMobile 
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
    </div>
  );
};

export default GuestVideoCard;