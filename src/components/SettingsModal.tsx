import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userId }) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { changeLanguage, currentLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState<'appearance' | 'privacy' | 'security' | 'account'>('appearance');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // إعدادات الخصوصية
  const [privacySettings, setPrivacySettings] = useState({
    is_private: false,
    allow_dms: true,
    show_activity_status: true
  });

  // تغيير كلمة المرور
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // حذف الحساب
  const [deletePassword, setDeletePassword] = useState('');

  // جلب إعدادات الخصوصية عند فتح المودال
  useEffect(() => {
    if (isOpen && activeTab === 'privacy') {
      fetchPrivacySettings();
    }
  }, [isOpen, activeTab]);

  const fetchPrivacySettings = async () => {
    try {
      const response = await api.get('/users/privacy-settings');
      if (response.data.success) {
        setPrivacySettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
      setMessage(t('failedToLoadSettings') || 'Failed to load settings');
    }
  };

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    changeLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handlePrivacySettingChange = (key: keyof typeof privacySettings, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePrivacySettings = async () => {
    try {
      setLoading(true);
      const response = await api.put('/users/privacy-settings', privacySettings);

      if (response.data.success) {
        setMessage(t('privacySettingsUpdated') || 'Privacy settings updated successfully');
      } else {
        setMessage(t('failedToUpdateSettings') || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      setMessage(t('failedToUpdateSettings') || 'Failed to update settings');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setMessage(t('fillAllFields') || 'Please fill all fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage(t('passwordMinLength') || 'Password must be at least 6 characters');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage(t('passwordsDoNotMatch') || 'Passwords do not match');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setLoading(true);
      const response = await api.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setMessage(t('passwordChangedSuccess') || 'Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage(response.data.message || t('failedToChangePassword') || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Failed to change password:', error);
      setMessage(error.response?.data?.message || t('failedToChangePassword') || 'Failed to change password');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setMessage(t('enterPasswordToDelete') || 'Please enter your password to delete account');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!window.confirm(t('confirmAccountDeletion') || 'Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete('/users/account', {
        data: { password: deletePassword }
      });

      if (response.data.success) {
        setMessage(t('accountDeletedSuccess') || 'Account deleted successfully');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setMessage(response.data.message || t('failedDeleteAccount') || 'Failed to delete account');
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      setMessage(error.response?.data?.message || t('failedDeleteAccount') || 'Failed to delete account');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border shadow-2xl ${theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 to-black border-gray-700/50'
          : 'bg-gradient-to-br from-gray-50 to-white border-gray-300'
          }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${theme === 'dark' ? 'border-gray-700/50 bg-black/50' : 'border-gray-200 bg-white/50'
          }`}>
          <div>
            <h2 className={`text-lg sm:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              {t('settings')}
            </h2>
            <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
              {t('manageAccountPreferences')}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-xl sm:text-2xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-colors ${theme === 'dark'
              ? 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300'
              }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row h-[500px] sm:h-[600px]">
          {/* Sidebar - Mobile Tabs */}
          <div className={`md:hidden border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'
            }`}>
            <div className="flex overflow-x-auto p-2 space-x-1">
              {[
                { id: 'appearance', icon: '🎨', label: t('appearance') },
                { id: 'privacy', icon: '🔒', label: t('privacy') },
                { id: 'security', icon: '🛡️', label: t('security') },
                { id: 'account', icon: '👤', label: t('account') }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-gray-400 hover:text-white'
                      : 'bg-gray-200 text-gray-700 hover:text-gray-900'
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar - Desktop */}
          <div className={`hidden md:block w-full md:w-1/3 lg:w-1/4 border-r p-4 ${theme === 'dark' ? 'border-gray-700/50 bg-black/30' : 'border-gray-200 bg-gray-50/50'
            }`}>
            <div className="space-y-2">
              {[
                { id: 'appearance', icon: '🎨', label: t('appearance'), desc: t('theme') + ' & ' + t('language') },
                { id: 'privacy', icon: '🔒', label: t('privacy'), desc: t('privacySettings') },
                { id: 'security', icon: '🛡️', label: t('security'), desc: t('changePassword') },
                { id: 'account', icon: '👤', label: t('account'), desc: t('accountSettings') }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 space-x-reverse p-3 sm:p-4 rounded-xl text-right transition-all duration-200 ${activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : theme === 'dark'
                      ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
                      : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm sm:text-base">{tab.label}</div>
                    <div className={`text-xs mt-1 ${activeTab === tab.id ? 'text-blue-100' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      {tab.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className={`text-lg sm:text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    {t('appearance')}
                  </h3>

                  {/* Language Selection */}
                  <div className={`rounded-xl p-4 sm:p-6 mb-4 ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-gray-100 border border-gray-200'
                    }`}>
                    <h4 className={`font-medium text-sm sm:text-base mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                      🌐 {t('language')}
                    </h4>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${currentLanguage === 'en'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                      >
                        🇬🇧 {t('english')}
                      </button>
                      <button
                        onClick={() => handleLanguageChange('ar')}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${currentLanguage === 'ar'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                      >
                        🇸🇦 {t('arabic')}
                      </button>
                    </div>
                  </div>

                  {/* Theme Selection */}
                  <div className={`rounded-xl p-4 sm:p-6 ${theme === 'dark' ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-gray-100 border border-gray-200'
                    }`}>
                    <h4 className={`font-medium text-sm sm:text-base mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                      🎨 {t('theme')}
                    </h4>
                    <div className="flex gap-3">
                      <button
                        onClick={() => theme === 'light' ? null : toggleTheme()}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${theme === 'light'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                      >
                        ☀️ {t('lightMode')}
                      </button>
                      <button
                        onClick={() => theme === 'dark' ? null : toggleTheme()}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${theme === 'dark'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                      >
                        🌙 {t('darkMode')}
                      </button>
                    </div>

                    {/* Preview */}
                    <div className={`mt-4 p-4 rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-gray-600 bg-gray-900/50' : 'border-gray-300 bg-white/50'
                      }`}>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {theme === 'dark' ? '🌙 ' : '☀️ '}
                        {t('theme')}: {theme === 'dark' ? t('dark') : t('light')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className={`text-lg sm:text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    {t('privacySettings')}
                  </h3>

                  <div className="space-y-4">
                    <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-200'
                      }`}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex-1 ml-3">
                          <div className={`font-medium text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {t('privateAccount')}
                          </div>
                          <div className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {t('privateAccountDesc')}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.is_private}
                          onChange={(e) => handlePrivacySettingChange('is_private', e.target.checked)}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </label>
                    </div>

                    <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-200'
                      }`}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex-1 ml-3">
                          <div className={`font-medium text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {t('allowDirectMessages')}
                          </div>
                          <div className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {t('allowDirectMessagesDesc')}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.allow_dms}
                          onChange={(e) => handlePrivacySettingChange('allow_dms', e.target.checked)}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </label>
                    </div>

                    <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-200'
                      }`}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex-1 ml-3">
                          <div className={`font-medium text-sm sm:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                            {t('showActivityStatus')}
                          </div>
                          <div className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {t('showActivityStatusDesc')}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.show_activity_status}
                          onChange={(e) => handlePrivacySettingChange('show_activity_status', e.target.checked)}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSavePrivacySettings}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('saving')}
                    </>
                  ) : (
                    t('saveChanges')
                  )}
                </button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className={`text-lg sm:text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    {t('security')}
                  </h3>

                  <div className="space-y-4">
                    <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-200'
                      }`}>
                      <h4 className={`font-medium text-sm sm:text-base mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        {t('changePassword')}
                      </h4>
                      <p className={`text-xs sm:text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {t('passwordMinLength')}
                      </p>

                      <div className="space-y-3">
                        <input
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          placeholder={t('currentPassword') || 'Current Password'}
                          className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                        />
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder={t('newPassword') || 'New Password'}
                          className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                        />
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          placeholder={t('confirmPassword') || 'Confirm Password'}
                          className={`w-full px-3 py-2 rounded-lg border ${theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                            }`}
                        />
                      </div>

                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {t('changing')}
                          </>
                        ) : (
                          t('changePassword')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className={`text-lg sm:text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    {t('accountSettings')}
                  </h3>

                  <div className="space-y-4">
                    <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-200'
                      }`}>
                      <h4 className={`font-medium text-sm sm:text-base mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                        {t('downloadYourData')}
                      </h4>
                      <p className={`text-xs sm:text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {t('downloadYourDataDesc')}
                      </p>
                      <button className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base">
                        {t('request')}
                      </button>
                    </div>

                    <div className={`rounded-xl p-4 border border-red-500/20 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-red-50'
                      }`}>
                      <h4 className="font-medium text-sm sm:text-base mb-2 text-red-400">
                        {t('dangerZone')}
                      </h4>
                      <p className={`text-xs sm:text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {t('deleteAccountWarning')}
                      </p>

                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder={t('enterPasswordToDelete') || 'Enter your password to delete account'}
                        className={`w-full px-3 py-2 rounded-lg border mb-3 ${theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                      />

                      <button
                        onClick={handleDeleteAccount}
                        disabled={loading || !deletePassword}
                        className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>{t('deleting')}</span>
                          </>
                        ) : (
                          <>
                            <span>🗑️</span>
                            <span>{t('deleteAccount')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Display */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`p-3 sm:p-4 rounded-xl mt-4 text-sm sm:text-base ${message.includes('Failed') || message.includes('فشل') || message.includes('Error') || message.includes('خطأ')
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {message.includes('Failed') || message.includes('فشل') || message.includes('Error') || message.includes('خطأ') ? (
                      <span>❌</span>
                    ) : (
                      <span>✅</span>
                    )}
                    <span>{message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;