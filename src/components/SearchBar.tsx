import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  onSearch,
  placeholder,
  className = '',
  size = 'md',
  autoFocus = false
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // الأحجام والأنماط بناءً على الحجم المحدد
  const sizeStyles = {
    sm: {
      container: 'h-10 rounded-lg',
      input: 'py-2 text-sm',
      button: 'p-2',
      icon: 'text-lg'
    },
    md: {
      container: 'h-12 rounded-xl',
      input: 'py-3 text-base',
      button: 'p-3',
      icon: 'text-xl'
    },
    lg: {
      container: 'h-14 rounded-xl',
      input: 'py-4 text-lg',
      button: 'p-3',
      icon: 'text-xl'
    }
  };

  const currentSize = sizeStyles[size];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch();
      setHasSearched(true);
    }
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
    if (hasSearched) {
      onSearch(); // إعادة البحث عند المسح
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full ${className}`}
      role="search"
    >
      <div
        className={`
          relative flex items-center bg-gray-800/80 backdrop-blur-sm border-2
          ${isFocused ? 'border-blue-500 bg-gray-900/90' : 'border-gray-600 hover:border-gray-500'}
          ${currentSize.container}
          transition-all duration-300 ease-in-out
          shadow-lg hover:shadow-xl
          group
        `}
      >
        {/* أيقونة البحث */}
        <button
          type="submit"
          className={`
            ${currentSize.button} 
            text-gray-400 hover:text-white 
            transition-all duration-200
            hover:scale-110 active:scale-95
            ${isRTL ? 'order-2' : 'order-1'}
            flex items-center justify-center
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          disabled={!query.trim()}
          aria-label={t('search') || 'Search'}
        >
          <span className={`${currentSize.icon} transition-transform duration-200 group-hover:scale-110`}>
            {query.trim() ? '🔍' : '🔎'}
          </span>
        </button>

        {/* حقل الإدخال */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('searchPage.placeholder') || 'Search...'}
          className={`
            flex-1 bg-transparent text-white placeholder-gray-400 
            focus:outline-none focus:ring-0
            ${currentSize.input}
            ${isRTL ? 'text-right pr-3' : 'text-left pl-3'}
            transition-all duration-200
            autofill:bg-transparent
          `}
          aria-label="Search input"
          enterKeyHint="search"
        />

        {/* مؤشر الكتابة */}
        {isFocused && (
          <div className={`
            absolute bottom-0 left-1/2 transform -translate-x-1/2
            w-8 h-0.5 bg-blue-500 rounded-full
            animate-pulse
            ${isRTL ? 'order-1' : 'order-2'}
          `} />
        )}

        {/* زر المسح */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`
              ${currentSize.button}
              text-gray-400 hover:text-white 
              transition-all duration-200
              hover:scale-110 active:scale-95
              ${isRTL ? 'order-1' : 'order-2'}
              flex items-center justify-center
              animate-fade-in
            `}
            aria-label={t('searchPage.clear') || 'Clear search'}
          >
            <span className={currentSize.icon}>✕</span>
          </button>
        )}

        {/* تأثير التوهج عند التركيز */}
        <div
          className={`
            absolute inset-0 rounded-inherit bg-blue-500/10
            transition-opacity duration-300
            ${isFocused ? 'opacity-100' : 'opacity-0'}
            pointer-events-none
          `}
        />
      </div>

      {/* عداد الأحرف (للشاشات المتوسطة والكبيرة) */}
      {query.length > 0 && size !== 'sm' && (
        <div className="flex justify-between items-center mt-2 px-1">
          <span className={`
            text-gray-500 text-xs transition-all duration-200
            ${query.length > 50 ? 'text-yellow-500' : ''}
            ${query.length > 100 ? 'text-red-500' : ''}
          `}>
            {query.length} حرف
          </span>
          
          {/* تحذير إذا تجاوز عدد الأحرف الحد المسموح */}
          {query.length > 100 && (
            <span className="text-red-400 text-xs">
              تجاوزت الحد المسموح للأحرف
            </span>
          )}
        </div>
      )}

      {/* اقتراحات سريعة (اختيارية) */}
      {size === 'lg' && (
        <div className="flex flex-wrap gap-2 justify-center mt-3">
          {['Trending', 'Music', 'Sports', 'Technology', 'News'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onQueryChange(suggestion);
                onSearch();
              }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full text-xs transition-all duration-200 active:scale-95"
            >
              #{suggestion}
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

export default SearchBar;