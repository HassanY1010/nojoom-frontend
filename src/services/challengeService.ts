import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}/api';

// ============ الحصول على التحديات النشطة ============
export const getActiveChallenges = async () => {
    try {
        const token = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const response = await axios.get(`${API_URL}/challenges/active`, config);
        return response.data;
    } catch (error) {
        console.error('Get active challenges error:', error);
        throw error;
    }
};

// ============ الحصول على التحديات السابقة ============
export const getPastChallenges = async (limit = 10) => {
    try {
        const response = await axios.get(`${API_URL}/challenges/past`, {
            params: { limit }
        });
        return response.data;
    } catch (error) {
        console.error('Get past challenges error:', error);
        throw error;
    }
};

// ============ الحصول على تفاصيل تحدي ============
export const getChallengeById = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const response = await axios.get(`${API_URL}/challenges/${id}`, config);
        return response.data;
    } catch (error) {
        console.error('Get challenge by ID error:', error);
        throw error;
    }
};

// ============ إضافة مشاركة في التحدي ============
export const submitChallengeEntry = async (challengeId, entryData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/challenges/${challengeId}/submit`,
            entryData,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Submit challenge entry error:', error);
        throw error;
    }
};

// ============ الحصول على مشاركات التحدي ============
export const getChallengeEntries = async (challengeId, limit = 50) => {
    try {
        const response = await axios.get(`${API_URL}/challenges/${challengeId}/entries`, {
            params: { limit }
        });
        return response.data;
    } catch (error) {
        console.error('Get challenge entries error:', error);
        throw error;
    }
};

// ============ الحصول على أوسمة المستخدم ============
export const getUserBadges = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/challenges/user/badges`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('Get user badges error:', error);
        throw error;
    }
};

// ============ إنشاء تحديات أسبوعية (Admin) ============
export const createWeeklyChallenges = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/challenges/admin/create-weekly`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Create weekly challenges error:', error);
        throw error;
    }
};

// ============ إنهاء التحديات المنتهية (Admin) ============
export const endExpiredChallenges = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/challenges/admin/end-expired`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data;
    } catch (error) {
        console.error('End expired challenges error:', error);
        throw error;
    }
};
