import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';

// صفحات رئيسية
import Home from './pages/Home';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Explore from './pages/Explore';
import Admin from './pages/Admin';
import Friends from './pages/Friends';
import Search from './pages/Search';
import Challenges from './pages/Challenges';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import FontTest from './pages/FontTest';

// ✅ OTP and Password Reset Pages
import EmailVerification from './pages/EmailVerification';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetCode from './pages/VerifyResetCode';
import NewPassword from './pages/NewPassword';

import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import './i18n';
import './index.css';

// مكون مجمع لتطبيق الاتجاه والثيم
function AppContent() {
  const { direction, isRTL } = useLanguage();
  const { theme } = useTheme();

  return (
    <div
      dir={direction}
      className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-gray-900'
        } ${isRTL ? 'font-arabic' : 'font-english'}`}
    >
      <Navbar />
      <main className="relative">
        <Routes>
          {/* الصفحات الرئيسية */}
          <Route path="/" element={<Home />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<Search />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/font-test" element={<FontTest />} />

          {/* ✅ Email Verification (OTP) */}
          <Route path="/verify-email" element={<EmailVerification />} />

          {/* ✅ Password Reset Flow */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-reset-code" element={<VerifyResetCode />} />
          <Route path="/reset-password" element={<NewPassword />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <Router>
                <AppContent />
              </Router>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
