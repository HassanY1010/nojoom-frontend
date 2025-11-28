import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lng: string) => void;
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();

  // اللغة الأساسية القادمة من i18n
  const [language, setLanguage] = useState(i18n.language);

  // حساب RTL بناءً على اللغة الحالية
  const isRTL = language === 'ar';
  const direction: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguage(lng);

    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;

    // تطبيق الخط حسب اللغة
    if (lng === 'ar') {
      document.body.style.fontFamily = "'Tajawal', 'Poppins', sans-serif";
    } else {
      document.body.style.fontFamily = "'Poppins', 'Tajawal', sans-serif";
    }
  };

  useEffect(() => {
    // تحديث اتجاه الصفحة
    document.documentElement.dir = direction;
    document.documentElement.lang = language;

    // تطبيق الخط
    if (language === 'ar') {
      document.body.style.fontFamily = "'Tajawal', 'Poppins', sans-serif";
    } else {
      document.body.style.fontFamily = "'Poppins', 'Tajawal', sans-serif";
    }

    // التزامن مع تغيير لغة i18next
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, direction, language]);

  const value: LanguageContextType = {
    currentLanguage: language,
    changeLanguage,
    isRTL,
    direction,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
