import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import mlTranslation from './locales/ml.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  ml: {
    translation: mlTranslation,
  },
};

const savedLanguage = typeof window !== 'undefined' ? (localStorage.getItem('language') || 'en') : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('language', lng);
  } catch {
    // ignore
  }
});

export default i18n;
