import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onUploadSuccess: () => void;
  isVideoOwner?: boolean;
  currentVideoId?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  file,
  onUploadSuccess,
  isVideoOwner = false,
  currentVideoId
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoResolution, setVideoResolution] = useState<string>('');
  const [uploadStage, setUploadStage] = useState<'preparing' | 'uploading' | 'processing' | 'complete'>('preparing');
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);

      const video = videoRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;
      setVideoResolution(`${width}x${height}`);

      // التحقق من نسبة العرض إلى الارتفاع 16:9
      const aspectRatio = width / height;
      const is16by9 = Math.abs(aspectRatio - 16 / 9) < 0.1;

      if (!is16by9) {
        console.warn('Video aspect ratio is not 16:9');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!file) {
      setError('Please select a video file first.');
      return;
    }

    if (!user) {
      setError('Please log in to upload videos.');
      return;
    }

    // جلب التوكن من localStorage
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Please log in to upload videos.');
      return;
    }

    // التحقق من مدة الفيديو
    if (videoDuration > 300) { // 5 دقائق كحد أقصى
      setError('Video duration must be less than 5 minutes.');
      return;
    }

    // التحقق من حجم الملف (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('preparing');

    try {
      const formData = new FormData();
      formData.append('video', file);

      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (user && user.id) {
        formData.append('userId', user.id.toString());
      }

      if (isVideoOwner && currentVideoId) {
        formData.append('replaceVideoId', currentVideoId.toString());
      }

      setUploadStage('uploading');

      // ✅ استخدام axios مباشرة مع إعدادات محسنة
      const response = await api.post('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        withCredentials: true, // ✅ إضافة هذا السطر
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setUploadProgress(Math.round(progress));

            if (progress >= 90) {
              setUploadStage('processing');
            }
          }
        },
        timeout: 120000,
      });

      setUploadProgress(100);
      setUploadStage('complete');

      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('✅ Video uploaded successfully:', response.data);
      onUploadSuccess();
      resetForm();
      onClose();

    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      setUploading(false);

      let errorMessage = 'Upload failed. Please try again.';
      let errorDetails = '';

      if (error.response) {
        const status = error.response.status;

        if (status === 413) {
          errorMessage = 'File too large';
          errorDetails = 'Please choose a video smaller than 10MB.';
        } else if (status === 415) {
          errorMessage = 'Unsupported file type';
          errorDetails = 'Please use MP4, WebM, or OGG format.';
        } else if (status === 401) {
          errorMessage = 'Authentication required';
          errorDetails = 'Please log in to upload videos.';
        } else if (status === 429) {
          errorMessage = 'Upload limit reached';
          errorDetails = 'Please try again in a few minutes.';
        } else if (status === 500) {
          errorMessage = 'Server error';
          errorDetails = 'Please try again later.';
        } else {
          errorMessage = 'Upload failed';
          errorDetails = error.response.data?.message || 'Please try again.';
        }
      } else if (error.request) {
        errorMessage = 'Connection error';
        errorDetails = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout';
        errorDetails = 'The upload took too long. Please try again.';
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Network error';
        errorDetails = 'Please check your internet connection and CORS settings.';
      }

      setError(`${errorMessage}\n${errorDetails}`);
    } finally {
      if (!error) {
        setUploading(false);
        setUploadProgress(0);
        setUploadStage('preparing');
      }
    }
  };

  const resetForm = () => {
    setDescription('');
    setPreviewUrl('');
    setUploadProgress(0);
    setVideoDuration(0);
    setVideoResolution('');
    setUploadStage('preparing');
    setError('');
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onClose();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 sm:p-6 w-full max-w-md mx-auto border border-gray-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {uploading ? (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <span className="truncate">
                    {uploadStage === 'preparing' && 'Preparing...'}
                    {uploadStage === 'uploading' && 'Uploading...'}
                    {uploadStage === 'processing' && 'Processing...'}
                    {uploadStage === 'complete' && 'Complete!'}
                  </span>
                </div>
              ) : (
                'Upload Video'
              )}
            </h2>
            {isVideoOwner && (
              <p className="text-green-400 text-xs sm:text-sm mt-1 flex items-center">
                <span className="ml-1 sm:ml-2">🎬</span>
                Video Owner Mode
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 ml-2 sm:ml-4"
            disabled={uploading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
              <div className="flex items-start space-x-2 rtl:space-x-reverse">
                <span className="text-red-400 text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="text-red-400 text-sm font-medium whitespace-pre-line">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Video Preview */}
          {previewUrl && (
            <div className="bg-black rounded-xl overflow-hidden border border-gray-700/50">
              <video
                ref={videoRef}
                src={previewUrl}
                className="w-full h-32 sm:h-48 object-cover bg-black"
                controls
                playsInline
                onLoadedMetadata={handleVideoLoaded}
              />
              <div className="p-2 sm:p-3 bg-gray-800/50 backdrop-blur-sm">
                <div className="flex justify-between items-center text-xs text-gray-300 flex-wrap gap-1">
                  <span>Duration: {formatDuration(videoDuration)}</span>
                  {videoResolution && (
                    <span className="text-xs">Resolution: {videoResolution}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File Info */}
          <div className="bg-gray-800/30 rounded-xl p-3 sm:p-4 border border-gray-700/30">
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex-shrink-0">File Name:</span>
                <span className="text-white font-medium truncate text-right ml-2 max-w-[180px] sm:max-w-[200px]">
                  {file?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">File Size:</span>
                <span className="text-white">
                  {file ? formatFileSize(file.size) : '0 Bytes'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">File Type:</span>
                <span className="text-white capitalize">
                  {file?.type.replace('video/', '') || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-white mb-2 sm:mb-3">
              <span className="flex items-center space-x-2 rtl:space-x-reverse">
                <span>Video Caption</span>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
                  Optional
                </span>
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your video... (e.g., 'Amazing sunset timelapse 🌅')"
              className="w-full h-20 sm:h-24 px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none text-sm transition-all duration-200 backdrop-blur-sm"
              maxLength={150}
              disabled={uploading || !user}
            />
            <div className="flex justify-between items-center mt-1 sm:mt-2">
              <div className="text-xs text-gray-400">
                {description.length}/150 characters
              </div>
              {description.length > 0 && (
                <div className="text-xs text-blue-400">
                  {150 - description.length} remaining
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-3 sm:space-y-4 bg-gray-800/30 rounded-xl p-3 sm:p-4 border border-gray-700/30">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-300 font-medium truncate">
                  {uploadStage === 'preparing' && 'Preparing upload...'}
                  {uploadStage === 'uploading' && 'Uploading video...'}
                  {uploadStage === 'processing' && 'Processing video...'}
                  {uploadStage === 'complete' && 'Upload complete!'}
                </span>
                <span className="text-white font-bold flex-shrink-0 ml-2">
                  {uploadProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2 sm:h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* Stage Indicators */}
              <div className="flex justify-between text-xs text-gray-400">
                <span className={`text-center flex-1 ${uploadStage === 'preparing' ? 'text-blue-400 font-medium' : ''}`}>
                  Preparing
                </span>
                <span className={`text-center flex-1 ${uploadStage === 'uploading' ? 'text-blue-400 font-medium' : ''}`}>
                  Uploading
                </span>
                <span className={`text-center flex-1 ${uploadStage === 'processing' ? 'text-blue-400 font-medium' : ''}`}>
                  Processing
                </span>
                <span className={`text-center flex-1 ${uploadStage === 'complete' ? 'text-green-400 font-medium' : ''}`}>
                  Complete
                </span>
              </div>

              <p className="text-xs text-gray-400 text-center pt-1 sm:pt-2">
                {isVideoOwner
                  ? '📹 Replacing current video...'
                  : '🎬 Uploading new video...'}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium border border-gray-600 hover:border-gray-500 text-sm sm:text-base"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={uploading || !file || !user}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              {uploading ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{uploadProgress}%</span>
                </>
              ) : (
                <>
                  <span>📹</span>
                  <span>Upload Video</span>
                </>
              )}
            </button>
          </div>

          {/* Tips & Information */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3 rtl:space-x-reverse">
              <div className="text-blue-400 text-base sm:text-lg flex-shrink-0">💡</div>
              <div className="text-xs text-blue-300">
                <p className="font-medium mb-1">Upload Tips:</p>
                <ul className="space-y-0.5 sm:space-y-1">
                  <li>• Max file size: 10MB</li>
                  <li>• Supported formats: MP4, WebM, OGG</li>
                  <li>• Recommended: 16:9 aspect ratio</li>
                  <li>• Max duration: 5 minutes</li>
                  <li>• Stable internet connection required</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message for non-logged in users */}
          {!user && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="text-red-400">⚠️</span>
                <p className="text-red-400 text-xs sm:text-sm">
                  Please log in to upload videos
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
