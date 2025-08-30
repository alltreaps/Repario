import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import i18n, { type LanguageCode, LANGUAGES } from '../lib/i18n';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, params?: Record<string, any>) => string;
  isRTL: boolean;
  availableLanguages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Get initial language from localStorage or default to 'en'
  const getInitialLanguage = (): LanguageCode => {
    const stored = localStorage.getItem('repario-language');
    if (stored && LANGUAGES.some(lang => lang.code === stored)) {
      return stored as LanguageCode;
    }
    return 'en';
  };

  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(getInitialLanguage);

  // Set language and persist to localStorage
  const setLanguage = (language: LanguageCode) => {
    setCurrentLanguage(language);
    localStorage.setItem('repario-language', language);
    i18n.setLocale(language);
    
    // Update document direction for RTL languages
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  };

  // Translation function
  const t = (key: string, params?: Record<string, any>): string => {
    try {
      return i18n.t(key, params);
    } catch (error) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
  };

  // Check if current language is RTL
  const isRTL = currentLanguage === 'ar';

  // Initialize i18n on mount
  useEffect(() => {
    i18n.setLocale(currentLanguage);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, isRTL]);

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    isRTL,
    availableLanguages: LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Helper hook for just the translation function
export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}
