import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import NotificationBell from './NotificationBell';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
const { currentLanguage, changeLanguage, isRTL } = useLanguage();

  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (user) {
      checkUserVideo();
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const checkUserVideo = async () => {
    try {
      const response = await api.get('/videos/user/video');
      setHasVideo(!!response.data.video);
    } catch (error) {
      console.error('Failed to check user video:', error);
      setHasVideo(false);
    }
  };

 const handleLogout = () => {
  logout();
  navigate('/');
  setIsMenuOpen(false);
};

const handleLanguageChange = () => {
  const newLanguage = currentLanguage === 'en' ? 'ar' : 'en';
  changeLanguage(newLanguage);
};


  const navItems = user ? [
    { path: '/', label: t('home'), emoji: '🏠', mobile: true },
    { path: '/search', label: t('search'), emoji: '🔍', mobile: true },
    {
      path: '/upload',
      label: hasVideo ? t('changeVideo') : t('addVideo'),
      emoji: hasVideo ? '🔄' : '➕',
      mobile: true
    },
    { path: '/messages', label: t('chat') || 'الشات', emoji: '💬', mobile: true },
    { path: `/profile/${user.username}`, label: t('profile'), emoji: '👤', mobile: true },

    // Desktop only items
    { path: '/explore', label: t('explore'), emoji: '🧭', mobile: false },
    { path: '/friends', label: t('following'), emoji: '⭐', mobile: false },
    ...(user.role === 'admin' ? [{ path: '/admin', label: t('admin'), emoji: '👑', mobile: false }] : [])
  ] : [
    { path: '/', label: t('home'), emoji: '🏠', mobile: true },
    { path: '/search', label: t('search'), emoji: '🔍', mobile: true },
    { path: '/login', label: t('login'), emoji: '🔐', mobile: true },
    { path: '/register', label: t('signUp'), emoji: '✨', mobile: false }
  ];

  const mobileNavItems = navItems.filter(item => item.mobile);
  const desktopNavItems = navItems;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:flex fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/95 backdrop-blur-md border-b border-gray-800' : 'bg-black'
        }`}>
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <Link
                to="/"
                className="flex items-center space-x-2 rtl:space-x-reverse hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                  <span className="text-black font-bold text-sm">N</span>
                </div>
                <span className="text-white font-bold text-xl">Nojoom</span>
              </Link>

              {/* Language Toggle Button */}
            <button
  onClick={handleLanguageChange}
  className="flex items-center justify-between p-3 text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
>
  <span>{t('language')}</span>
  <span className="text-lg">
    {currentLanguage === 'en' ? '🇸🇦 العربية' : '🇬🇧 English'}
  </span>
</button>


              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>

            {/* Desktop Navigation Items */}
            <div className="flex items-center space-x-6 rtl:space-x-reverse">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${location.pathname === item.path
                    ? 'text-white bg-gray-800'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                >
                  <span className="text-base">{item.emoji}</span>
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* Notification Bell */}
              {user && <NotificationBell />}

              {user && (
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  {t('logout')}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-gray-800 lg:hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-around items-center h-16">
            {mobileNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[60px] ${location.pathname === item.path
                  ? 'text-white bg-gray-800 transform scale-105'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-[10px] sm:text-xs mt-1 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[60px] ${isMenuOpen
                ? 'text-white bg-gray-800 transform scale-105'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
            >
              <span className="text-xl">☰</span>
              <span className="text-[10px] sm:text-xs mt-1">{t('more')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className={`absolute bottom-20 left-4 right-4 bg-gray-900 rounded-2xl border border-gray-700 p-4 transform transition-all duration-300 ${isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col space-y-3">
              {/* Language Toggle in Mobile Menu */}
             <button
  onClick={handleLanguageChange}
  className="flex items-center justify-between p-3 text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
>
  <span>{t('language')}</span>
  <span className="text-lg">
    {currentLanguage === 'en' ? '🇸🇦 العربية' : '🇬🇧 English'}
  </span>
</button>


              {/* Theme Toggle in Mobile Menu */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-between p-3 text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <span>{t('theme')}</span>
                <span className="text-lg">
                  {theme === 'dark' ? '☀️ ' + t('light') : '🌙 ' + t('dark')}
                </span>
              </button>

              {/* Additional Navigation Items */}
              {navItems.filter(item => !item.mobile).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-xl transition-colors ${location.pathname === item.path
                    ? 'text-white bg-blue-600'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              {/* Logout in Mobile Menu */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 rtl:space-x-reverse p-3 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-xl transition-colors text-right"
                >
                  <span className="text-lg">🚪</span>
                  <span className="font-medium">{t('logout')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer for desktop nav */}
      <div className="hidden lg:block h-16"></div>
      {/* Spacer for mobile nav */}
      <div className="lg:hidden h-16"></div>
    </>
  );
};

export default Navbar;