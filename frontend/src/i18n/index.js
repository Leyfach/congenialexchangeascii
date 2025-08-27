import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language files
import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';
import zhTranslations from './locales/zh.json';
import csTranslations from './locales/cs.json';
import kkTranslations from './locales/kk.json';

const resources = {
  en: {
    translation: enTranslations
  },
  ru: {
    translation: ruTranslations
  },
  zh: {
    translation: zhTranslations
  },
  cs: {
    translation: csTranslations
  },
  kk: {
    translation: kkTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    react: {
      useSuspense: false, // Disable suspense for better loading experience
    }
  });

export default i18n;