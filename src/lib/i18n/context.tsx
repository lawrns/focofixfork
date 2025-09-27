import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LanguageCode, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, DATE_FORMAT_OPTIONS, NUMBER_FORMAT_OPTIONS } from './config';
import { TranslationSchema } from './translations/types';
import { en } from './translations/en';
import { es } from './translations/es';

// Lazy load other translations
const translations = {
  en,
  es,
  // Add lazy loading for other languages when needed
  // fr: () => import('./translations/fr').then(m => m.fr),
  // de: () => import('./translations/de').then(m => m.de),
  // pt: () => import('./translations/pt').then(m => m.pt),
  // zh: () => import('./translations/zh').then(m => m.zh),
  // ja: () => import('./translations/ja').then(m => m.ja),
  // ko: () => import('./translations/ko').then(m => m.ko),
  // ar: () => import('./translations/ar').then(m => m.ar),
  // hi: () => import('./translations/hi').then(m => m.hi),
} as const;

interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, any>) => string;
  formatDate: (date: Date | string | number, options?: keyof typeof DATE_FORMAT_OPTIONS) => string;
  formatNumber: (num: number, options?: keyof typeof NUMBER_FORMAT_OPTIONS) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date | string | number) => string;
  isLoading: boolean;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
}

const I18nContext = createContext<I18nContextType | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: LanguageCode;
  storageKey?: string;
}

export function I18nProvider({
  children,
  defaultLanguage = DEFAULT_LANGUAGE,
  storageKey = 'foco_language'
}: I18nProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(defaultLanguage);
  const [translations, setTranslations] = useState<Record<string, TranslationSchema>>({ en, es });
  const [isLoading, setIsLoading] = useState(false);

  // Load language from storage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(storageKey) as LanguageCode;
    if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, [storageKey]);

  // Update document direction for RTL languages
  useEffect(() => {
    const dir = SUPPORTED_LANGUAGES[language]?.direction || 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = async (lang: LanguageCode) => {
    if (!SUPPORTED_LANGUAGES[lang]) {
      console.warn(`Language ${lang} is not supported`);
      return;
    }

    setIsLoading(true);

    try {
      // Load translation if not already loaded
      if (!translations[lang]) {
        const translationLoader = (translations as any)[lang];
        if (typeof translationLoader === 'function') {
          const loadedTranslation = await translationLoader();
          setTranslations(prev => ({
            ...prev,
            [lang]: loadedTranslation,
          }));
        }
      }

      setLanguageState(lang);
      localStorage.setItem(storageKey, lang);
    } catch (error) {
      console.error('Failed to load language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const t = (key: string, params?: Record<string, any>): string => {
    const translation = translations[language] || translations[DEFAULT_LANGUAGE];

    try {
      const keys = key.split('.');
      let value: any = translation;

      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }

      if (typeof value !== 'string') {
        console.warn(`Translation key "${key}" not found for language "${language}"`);
        // Fallback to English
        const englishTranslation = translations.en;
        let englishValue: any = englishTranslation;
        for (const k of keys) {
          englishValue = englishValue?.[k];
          if (englishValue === undefined) break;
        }
        value = englishValue;
      }

      // Interpolate parameters
      if (params && typeof value === 'string') {
        return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
          return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
        }, value);
      }

      return typeof value === 'string' ? value : key;
    } catch (error) {
      console.error('Translation error:', error);
      return key;
    }
  };

  const formatDate = (date: Date | string | number, options: keyof typeof DATE_FORMAT_OPTIONS = 'medium'): string => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }

      return new Intl.DateTimeFormat(language, DATE_FORMAT_OPTIONS[options]).format(dateObj);
    } catch (error) {
      console.error('Date formatting error:', error);
      return String(date);
    }
  };

  const formatNumber = (num: number, options: keyof typeof NUMBER_FORMAT_OPTIONS = 'decimal'): string => {
    try {
      return new Intl.NumberFormat(language, NUMBER_FORMAT_OPTIONS[options]).format(num);
    } catch (error) {
      console.error('Number formatting error:', error);
      return String(num);
    }
  };

  const formatCurrency = (amount: number, currency = 'USD'): string => {
    try {
      return new Intl.NumberFormat(language, {
        ...NUMBER_FORMAT_OPTIONS.currency,
        currency,
      }).format(amount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${currency} ${amount}`;
    }
  };

  const formatRelativeTime = (date: Date | string | number): string => {
    try {
      const dateObj = new Date(date);
      const now = new Date();
      const diffMs = dateObj.getTime() - now.getTime();
      const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

      const timeKey = diffMs < 0 ? 'ago' : 'fromNow';

      if (diffDays === 0) {
        return t('time.justNow');
      } else if (diffDays === 1) {
        return diffMs < 0 ? t('time.yesterday') : t('time.tomorrow');
      } else if (diffDays < 7) {
        const unit = diffDays === 1 ? 'day' : 'days';
        return `${diffDays} ${t(`time.${unit}`)} ${t(`time.${timeKey}`)}`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        const unit = weeks === 1 ? 'week' : 'weeks';
        return `${weeks} ${t(`time.${unit}`)} ${t(`time.${timeKey}`)}`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        const unit = months === 1 ? 'month' : 'months';
        return `${months} ${t(`time.${unit}`)} ${t(`time.${timeKey}`)}`;
      } else {
        const years = Math.floor(diffDays / 365);
        const unit = years === 1 ? 'year' : 'years';
        return `${years} ${t(`time.${unit}`)} ${t(`time.${timeKey}`)}`;
      }
    } catch (error) {
      console.error('Relative time formatting error:', error);
      return String(date);
    }
  };

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    isLoading,
    availableLanguages: SUPPORTED_LANGUAGES,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Convenience hook for translations
export function useTranslation() {
  const { t, formatDate, formatNumber, formatCurrency, formatRelativeTime } = useI18n();
  return { t, formatDate, formatNumber, formatCurrency, formatRelativeTime };
}

// Hook for pluralization
export function usePlural(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}
