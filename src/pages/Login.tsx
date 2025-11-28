import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // دالة تسجيل الدخول
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      console.log('✅ Login successful');
      navigate('/');
    } catch (err: any) {
      console.error('❌ Login error:', err);

     // تجاهل التحقق من البريد عند تسجيل الدخول
if (err.response?.status === 403 && err.response?.data?.emailVerified === false) {
  // بدل منع الدخول، أظهر رسالة عادية
  const errorMessage = t('loginFailed'); // أو رسالة عامة
  setError(errorMessage);
  // لا تعيد return
}


      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        t('loginFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // دالة للانتقال لصفحة التحقق
  const handleResendVerification = () => {
    navigate('/verify-email', {
      state: { email }
    });
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
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{t('signIn')}</h1>
          <p className="text-gray-400 text-sm sm:text-base">{t('welcomeBack')}</p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">⚠️</span>
                  <p className="text-red-400 text-sm">
                    {error === 'emailNotVerified'
                      ? t('pleaseVerifyEmailFirst') || 'Please verify your email before logging in'
                      : error
                    }
                  </p>
                </div>

               
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2 text-right">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('enterEmail')}
              dir={isRTL ? 'rtl' : 'ltr'}
              className={`w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-gray-400 placeholder-gray-500 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'
                }`}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2 text-right">
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t('enterPassword')}
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-gray-400 placeholder-gray-500 text-sm sm:text-base ${isRTL ? 'text-right pr-12' : 'text-left pl-12'
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

          {/* Forgot Password */}
          <div className={`text-${isRTL ? 'left' : 'right'}`}>
            <Link to="/forgot-password" className="text-gray-400 hover:text-white transition-colors text-xs sm:text-sm">
              {t('forgotPassword')}
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 transition-colors font-medium text-sm sm:text-base relative"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>{t('loggingIn')}</span>
              </div>
            ) : (
              t('signIn')
            )}
          </button>
        </motion.form>
        {/* Divider */}
        <motion.div
          className="flex items-center my-4 sm:my-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="px-3 sm:px-4 text-gray-400 text-xs sm:text-sm">{t('or')}</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </motion.div>

        {/* Sign Up Link */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-gray-400 text-sm sm:text-base">
            {t('dontHaveAccount')}{' '}
            <Link
              to="/register"
              className="text-white hover:text-gray-300 transition-colors font-medium underline"
            >
              {t('signUp')}
            </Link>
          </p>
        </motion.div>

        {/* Demo Accounts */}
        <motion.div
          className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-blue-400 text-xs text-center">
            <strong className="block mb-1">{t('demoAccounts')}:</strong>
            <span className="text-gray-400">
              admin@example.com / password123
            </span>
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="mt-6 grid grid-cols-2 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => {
              setEmail('demo@example.com');
              setPassword('password123');
            }}
            className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-xs"
          >
            {t('fillDemo')}
          </button>
          <button
            onClick={() => {
              setEmail('');
              setPassword('');
              setError('');
            }}
            className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-xs"
          >
            {t('clearAll')}
          </button>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-gray-500 text-xs">
            {t('secureLogin')} 🔒
          </p>
        </motion.div>
      </div>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black"></div>
      </div>
    </div>
  );
};

export default Login;
