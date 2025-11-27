import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { passwordResetApi } from '../services/api';

const ForgotPassword: React.FC = () => {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setError(t('emailRequired'));
            return;
        }

        if (!/\S+@\S+\.\S+/.test(email)) {
            setError(t('invalidEmail'));
            return;
        }

        try {
            setError('');
            setLoading(true);

            await passwordResetApi.sendResetCode(email);

            // Navigate to verify code page
            navigate('/verify-reset-code', {
                state: { email }
            });

        } catch (err: any) {
            console.error('Send reset code error:', err);
            setError(err.response?.data?.message || t('failedToSendResetCode'));
        } finally {
            setLoading(false);
        }
    };

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
                    {/* Lock Icon */}
                    <motion.div
                        className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        <span className="text-4xl">🔒</span>
                    </motion.div>

                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
                        {t('forgotPassword')}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        {t('enterEmailToResetPassword')}
                    </p>
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
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
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {/* Email Input */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2 text-right">
                            {t('email')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError('');
                            }}
                            required
                            placeholder={t('enterEmail')}
                            dir={isRTL ? 'rtl' : 'ltr'}
                            className={`w-full px-4 py-3 bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-600'
                                } text-white rounded-lg focus:outline-none focus:border-gray-400 placeholder-gray-500 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'
                                }`}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black py-3 rounded-lg hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 transition-colors font-medium text-sm sm:text-base"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                <span>{t('sending')}</span>
                            </div>
                        ) : (
                            t('sendResetCode')
                        )}
                    </button>
                </motion.form>

                {/* Back to Login */}
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

                {/* Info Box */}
                <motion.div
                    className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <p className="text-blue-400 text-xs text-center">
                        <strong className="block mb-1">ℹ️ {t('note')}</strong>
                        {t('resetCodeWillExpireIn10Minutes')}
                    </p>
                </motion.div>
            </div>

            {/* Background Pattern */}
            <div className="fixed inset-0 -z-10 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-pink-900"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black"></div>
            </div>
        </div>
    );
};

export default ForgotPassword;
