export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  es: {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    direction: 'ltr',
  },
  fr: {
    code: 'fr',
    name: 'Français',
    flag: '🇫🇷',
    direction: 'ltr',
  },
  de: {
    code: 'de',
    name: 'Deutsch',
    flag: '🇩🇪',
    direction: 'ltr',
  },
  pt: {
    code: 'pt',
    name: 'Português',
    flag: '🇵🇹',
    direction: 'ltr',
  },
  zh: {
    code: 'zh',
    name: '中文',
    flag: '🇨🇳',
    direction: 'ltr',
  },
  ja: {
    code: 'ja',
    name: '日本語',
    flag: '🇯🇵',
    direction: 'ltr',
  },
  ko: {
    code: 'ko',
    name: '한국어',
    flag: '🇰🇷',
    direction: 'ltr',
  },
  ar: {
    code: 'ar',
    name: 'العربية',
    flag: '🇸🇦',
    direction: 'rtl',
  },
  hi: {
    code: 'hi',
    name: 'हिन्दी',
    flag: '🇮🇳',
    direction: 'ltr',
  },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[LanguageCode];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const RTL_LANGUAGES: LanguageCode[] = ['ar'];

export const NUMBER_FORMAT_OPTIONS = {
  currency: {
    style: 'currency',
    currency: 'USD',
  },
  percent: {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  },
  decimal: {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
} as const;

export const DATE_FORMAT_OPTIONS = {
  short: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  medium: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  long: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  },
  time: {
    hour: '2-digit',
    minute: '2-digit',
  },
  datetime: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
} as const;
