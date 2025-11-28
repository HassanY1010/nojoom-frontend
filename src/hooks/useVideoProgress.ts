// hooks/useVideoProgress.ts
import { useState, useEffect, useCallback, RefObject } from 'react';
import api from '../services/api';

interface VideoProgress {
    lastPosition: number;
    watchTime: number;
    completed: boolean;
}

/**
 * Custom hook لإدارة تقدم مشاهدة الفيديو
 * يقوم بتحميل آخر نقطة مشاهدة وحفظ التقدم تلقائياً
 */
export const useVideoProgress = (
  videoRef: RefObject<HTMLVideoElement | null>, // ✅ السماح بأن يكون null
  videoId: number,
  isActive: boolean
) => {
  const [progress, setProgress] = useState<VideoProgress>({
    lastPosition: 0,
    watchTime: 0,
    completed: false,
  });
    const [isLoading, setIsLoading] = useState(true);
    const [lastSaveTime, setLastSaveTime] = useState(0);

    /**
     * تحميل آخر نقطة مشاهدة عند mount
     */
    useEffect(() => {
        const loadProgress = async () => {
            try {
                setIsLoading(true);
                const response = await api.get(`/videos/${videoId}/progress`);
                const data = response.data;

                setProgress({
                    lastPosition: data.lastPosition || 0,
                    watchTime: data.watchTime || 0,
                    completed: data.completed || false
                });

                console.log(`📊 Loaded progress for video ${videoId}:`, data);
            } catch (error) {
                console.error('Failed to load video progress:', error);
                // في حالة الخطأ، ابدأ من البداية
                setProgress({ lastPosition: 0, watchTime: 0, completed: false });
            } finally {
                setIsLoading(false);
            }
        };

        loadProgress();
    }, [videoId]);

    /**
     * تطبيق آخر نقطة مشاهدة على الفيديو
     */
    useEffect(() => {
        if (!isLoading && videoRef.current && progress.lastPosition > 0 && isActive) {
            // الانتقال إلى آخر نقطة مشاهدة (مع هامش 2 ثانية للخلف)
            const resumePosition = Math.max(0, progress.lastPosition - 2);
            videoRef.current.currentTime = resumePosition;
            console.log(`⏩ Resumed video ${videoId} at ${resumePosition}s`);
        }
    }, [isLoading, progress.lastPosition, videoId, isActive]);

    /**
     * حفظ التقدم الحالي
     */
    const saveProgress = useCallback(async (force = false) => {
        if (!videoRef.current) return;

        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        const now = Date.now();

        // حفظ كل 5 ثواني فقط (أو عند force)
        if (!force && now - lastSaveTime < 5000) {
            return;
        }

        try {
            const completed = duration > 0 && (currentTime / duration) >= 0.9;

            await api.post(`/videos/${videoId}/progress`, {
                lastPosition: currentTime,
                watchTime: Math.floor(currentTime),
                completed
            });

            setLastSaveTime(now);
            setProgress(prev => ({
                ...prev,
                lastPosition: currentTime,
                watchTime: Math.floor(currentTime),
                completed
            }));

            console.log(`💾 Saved progress for video ${videoId}: ${currentTime}s`);
        } catch (error) {
            console.error('Failed to save video progress:', error);
        }
    }, [videoId, lastSaveTime]);

    /**
     * حفظ التقدم تلقائياً كل 5 ثواني أثناء التشغيل
     */
    useEffect(() => {
        if (!isActive || !videoRef.current) return;

        const interval = setInterval(() => {
            saveProgress();
        }, 5000);

        return () => clearInterval(interval);
    }, [isActive, saveProgress]);

    /**
     * حفظ التقدم عند إيقاف الفيديو أو تغييره
     */
    useEffect(() => {
        return () => {
            // حفظ نهائي عند unmount
            saveProgress(true);
        };
    }, [saveProgress]);

    return {
        progress,
        isLoading,
        saveProgress,
        resumePosition: progress.lastPosition
    };
};

export default useVideoProgress;
