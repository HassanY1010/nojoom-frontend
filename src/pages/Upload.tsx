import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import UploadModal from '../components/UploadModal';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const Upload: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userVideo, setUserVideo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchUserVideo();
    }
  }, [user]);

  const fetchUserVideo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos/user/video');
      setUserVideo(response.data.video);
    } catch (error) {
      console.error('Failed to fetch user video:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // تحقق من نوع الملف
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidType = validTypes.includes(file.type) ||
      ['mp4', 'webm', 'ogg', 'mov'].includes(fileExtension || '');

    if (!isValidType) {
      alert(t('selectValidVideoFile'));
      return;
    }

    // تحقق من حجم الملف (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert(t('fileSizeLimit'));
      return;
    }

    setSelectedFile(file);
    setIsModalOpen(true);

    // reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadSuccess = () => {
    fetchUserVideo(); // تحديث حالة الفيديو بعد الرفع
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-sm w-full">
          {/* Lock Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-800 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center"
          >
            <span className="text-2xl sm:text-3xl">🔒</span>
          </motion.div>

          <motion.h1
            className="text-white text-lg sm:text-xl font-bold mb-2 sm:mb-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {t('signInToUpload')}
          </motion.h1>

          <motion.p
            className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {t('joinCommunityToShare')}
          </motion.p>

          <motion.div
            className="flex flex-col gap-2 sm:gap-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={() => navigate('/login')}
              className="bg-white text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-medium hover:bg-gray-200 transition-colors text-sm sm:text-base"
            >
              {t('signIn')}
            </button>

            <button
              onClick={() => navigate('/register')}
              className="bg-gray-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-medium hover:bg-gray-700 transition-colors text-sm sm:text-base"
            >
              {t('signUp')}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16 flex items-center justify-center p-4 sm:p-6">
      {/* Main Upload Container */}
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-white text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
              {userVideo ? t('changeVideo') : t('addVideo')}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">
              {userVideo
                ? t('replaceCurrentVideo')
                : t('shareWithCommunity')
              }
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mb-4 sm:mb-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Current Video Preview */}
          {userVideo && !loading && (
            <motion.div
              className="mb-4 sm:mb-6 bg-gray-900 rounded-lg sm:rounded-xl p-3 sm:p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-white text-sm font-medium mb-2 sm:mb-3 text-right">{t('currentVideo')}:</h3>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={`${import.meta.env.VITE_API_URL}${userVideo.path}`}
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                />
              </div>
              <p className="text-gray-400 text-xs mt-2 truncate text-right">
                {userVideo.description || t('noCaption')}
              </p>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>{new Date(userVideo.created_at).toLocaleDateString()}</span>
                <span>{Math.round(userVideo.duration || 0)}s</span>
              </div>
            </motion.div>
          )}

          {/* Drag & Drop Area */}
          <motion.div
            className={`relative border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-all duration-300 ${isDragging
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-600 hover:border-gray-400 bg-gray-900/50'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".mp4,.webm,.ogg,.mov,video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
            />

            {/* Upload Icon */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-xl sm:text-2xl">
                {userVideo ? '🔄' : '📁'}
              </span>
            </div>

            <h2 className="text-white font-medium mb-1 sm:mb-2 text-sm sm:text-base">
              {isDragging
                ? t('dropToUpload')
                : userVideo
                  ? t('selectNewVideo')
                  : t('selectVideoToUpload')
              }
            </h2>

            <p className="text-gray-400 text-xs mb-3 sm:mb-4">
              {t('orDragAndDrop')}
            </p>

            {/* File Requirements */}
            <div className="text-xs text-gray-500 space-y-1 mb-3 sm:mb-4">
              <p className="text-xs">{t('videoFormats')}: MP4, WebM, OGG, MOV</p>
              <p className="text-xs">{t('fileRequirements')}: {t('maxSize50MB')}</p>
            </div>

            {/* Upload Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-white text-black px-4 sm:px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors text-xs sm:text-sm"
            >
              {userVideo ? t('changeVideo') : t('selectFile')}
            </button>
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            className="mt-6 sm:mt-8 text-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-white text-sm font-medium mb-2 sm:mb-3">{t('tips')}:</h3>
            <ul className="text-gray-400 text-xs space-y-1.5 sm:space-y-2">
              <li className="flex items-start justify-end text-right">
                <span className="mr-2">•</span>
                <span className="flex-1">{t('tipAspectRatio')}</span>
              </li>
              <li className="flex items-start justify-end text-right">
                <span className="mr-2">•</span>
                <span className="flex-1">{t('tipVideoLength')}</span>
              </li>
              <li className="flex items-start justify-end text-right">
                <span className="mr-2">•</span>
                <span className="flex-1">{t('tipAutoReplace')}</span>
              </li>
              <li className="flex items-start justify-end text-right">
                <span className="mr-2">•</span>
                <span className="flex-1">{t('tipGoodLighting')}</span>
              </li>
            </ul>
          </motion.div>

          {/* Upload Stats */}
          {userVideo && (
            <motion.div
              className="mt-4 sm:mt-6 bg-gray-900 rounded-lg p-3 sm:p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h4 className="text-white text-sm font-medium mb-2 text-right">{t('videoStats')}:</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-gray-400">{t('views')}</div>
                  <div className="text-white font-medium">{userVideo.views || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">{t('likes')}</div>
                  <div className="text-white font-medium">{userVideo.likes || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">{t('comments')}</div>
                  <div className="text-white font-medium">{userVideo.comment_count || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">{t('uploaded')}</div>
                  <div className="text-white font-medium">
                    {new Date(userVideo.created_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        onUploadSuccess={() => {
          setSelectedFile(null);
          handleUploadSuccess();
        }}
      />
    </div>
  );
};

export default Upload;