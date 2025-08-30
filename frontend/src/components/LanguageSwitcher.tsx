import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'toggle';
}

export function LanguageSwitcher({ className = '', variant = 'dropdown' }: LanguageSwitcherProps) {
  const { currentLanguage, setLanguage, availableLanguages, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);

  if (variant === 'toggle') {
    const otherLang = currentLanguage === 'en'
      ? availableLanguages.find(lang => lang.code === 'ar')
      : availableLanguages.find(lang => lang.code === 'en');
    return (
      <button
        onClick={() => setLanguage(currentLanguage === 'en' ? 'ar' : 'en')}
        className={`inline-flex items-center gap-2 px-4 py-2 w-full justify-center rounded-xl font-semibold shadow-sm border border-slate-200/50 dark:border-slate-500/30 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-600 dark:hover:to-slate-500 transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        title={`Switch to ${otherLang?.nativeName}`}
      >
        <span className="text-base font-bold text-slate-700 dark:text-slate-200">{otherLang?.nativeName}</span>
        <Globe className="w-4 h-4 text-blue-500 dark:text-blue-300" />
      </button>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLang?.nativeName}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isRTL ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className={`absolute z-20 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg ${isRTL ? 'right-0' : 'left-0'}`}>
            <div className="py-1" role="menu" aria-orientation="vertical">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    setLanguage(language.code);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors ${
                    currentLanguage === language.code
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center justify-between">
                    <span>{language.nativeName}</span>
                    <span className="text-xs text-gray-500 uppercase">
                      {language.code}
                    </span>
                  </div>
                  {language.name !== language.nativeName && (
                    <div className="text-xs text-gray-500 mt-1">
                      {language.name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSwitcher;
