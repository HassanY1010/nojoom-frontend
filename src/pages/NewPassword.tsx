import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { passwordResetApi } from '../services/api';

const NewPassword: React.FC = () => {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || '';
    const code = location.state?.code || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Redirect if no email or code
    useEffect(() => {
        if (!email || !code) {
            navigate('/forgot-password');
        }
    }, [email, code, navigate]);

    const validatePassword = () => {
        if (!newPassword) {
            setError(t('passwordRequired'));
            return false;
        }

        if (newPassword.length < 6) {
            setError(t('passwordMinLength'));
            return false;
        }

        if (!confirmPassword) {
            setError(t('confirmPasswordRequired'));
            return false;
        }

        if (newPassword !== confirmPassword) {
            setError(t('passwordsDoNotMatch'));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validatePassword()) {
            return;
        }

        try {
            setError('');
            setLoading(true);

            await passwordResetApi.resetPassword(email, code, newPassword);

            setSuccess(true);

            // Navigate to login after 2 seconds
            setTimeout(() => {
                navigate('/login', {
                    state: { message: t('passwordResetSuccessfully') }
                });
            }, 2000);

        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.response?.data?.message || t('failedToResetPassword'));
        } finally {
            setLoading(false);
        }
    };

    if (!email || !code) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black pt-16 flex items-center justify-center px-3 sm:px-4">
            <div className="max-w-md w-full mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-6 sm:mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Key Icon */}
                    <motion.div
                        className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        <span className="text-4xl">🔑</span>
                    </motion.div>

                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
                        {t('setNewPassword')}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        {t('enterYourNewPassword')}
                    </p>
                </motion.div>

                {/* Success Animation */}
                <AnimatePresence>
                    {success && (
                        <motion.div
                            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-3xl">✅</span>
                                <p className="text-green-400 font-medium">{t('passwordResetSuccessful')}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                    {error && !success && (
                        <motion.div
                            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex items-center space-x-2">
                                <span className="text-red-400">⚠️</span>
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <motion.form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {/* New Password */}
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2 text-right">
                            {t('newPassword')}
                        </label>
                        <div className="relative">
                            <input
                                id="newPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    setError('');
                                }}
                                required
                                placeholder={t('enterNewPassword')}
                                dir={isRTL ? 'rtl' : 'ltr'}
                                disabled={success}
                                className={`w-full px-4 py-3 bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-600'
                                    } text-white rounded-lg focus:outline-none focus:border-gray-400 placeholder-gray-500 text-sm sm:text-base ${isRTL ? 'text-right pr-12' : 'text-left pl-12'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 ${isRTL ? 'left-3' : 'right-3'
                                    }`}
                                tabIndex={-1}
                            >
                                <span>{showPassword ? '🙈' : '👁️'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2 text-right">
                            {t('confirmPassword')}
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError('');
                                }}
                                required
                                placeholder={t('confirmNewPassword')}
                                dir={isRTL ? 'rtl' : 'ltr'}
                                disabled={success}
                                className={`w-full px-4 py-3 bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-600'
                                    } text-white rounded-lg focus:outline-none focus:border-gray-400 placeholder-gray-500 text-sm sm:text-base ${isRTL ? 'text-right pr-12' : 'text-left pl-12'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1 ${isRTL ? 'left-3' : 'right-3'
                                    }`}
                                tabIndex={-1}
                            >
                                <span>{showConfirmPassword ? '🙈' : '👁️'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="text-xs text-gray-400 space-y-1">
                        <p className={newPassword.length >= 6 ? 'text-green-400' : ''}>
                            {newPassword.length >= 6 ? '✓' : '○'} {t('atLeast6Characters')}
                        </p>
                        <p className={newPassword && confirmPassword && newPassword === confirmPassword ? 'text-green-400' : ''}>
                            {newPassword && confirmPassword && newPassword === confirmPassword ? '✓' : '○'} {t('passwordsMatch')}
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full bg-white text-black py-3 rounded-lg hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 transition-colors font-medium text-sm sm:text-base mt-6"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                <span>{t('resetting')}</span>
                            </div>
                        ) : success ? (
                            t('redirectingToLogin')
                        ) : (
                            t('resetPassword')
                        )}
                    </button>
                </motion.form>

                {/* Back Button */}
                {!success && (
                    <motion.div
                        className="mt-6 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <button
                            onClick={() => navigate('/login')}
                            className="text-gray-400 hover:text-white transition-colors text-sm"
                        >
                            ← {t('backToLogin')}
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Background Pattern */}
            <div className="fixed inset-0 -z-10 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-900 via-black to-orange-900"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black"></div>
            </div>
        </div>
    );
};

export default NewPassword;
