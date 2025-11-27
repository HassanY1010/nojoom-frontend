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
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  const isRTL = currentLanguage === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    
    // تطبيق الخط المناسب حسب اللغة
    if (lng === 'ar') {
      document.body.style.fontFamily = "'Tajawal', 'Poppins', sans-serif";
    } else {
      document.body.style.fontFamily = "'Poppins', 'Tajawal', sans-serif";
    }
  };

  useEffect(() => {
    // تعيين اتجاه الصفحة عند التحميل الأولي
    document.documentElement.dir = direction;
    document.documentElement.lang = currentLanguage;
    
    // تطبيق الخط المناسب حسب اللغة
    if (currentLanguage === 'ar') {
      document.body.style.fontFamily = "'Tajawal', 'Poppins', sans-serif";
    } else {
      document.body.style.fontFamily = "'Poppins', 'Tajawal', sans-serif";
    }
    
    // الاستماع لتغييرات اللغة
    i18n.on('languageChanged', (lng) => {
      setCurrentLanguage(lng);
    });
  }, [i18n, direction, currentLanguage]);

  const value = {
    currentLanguage,
    changeLanguage,
    isRTL,
    direction
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};