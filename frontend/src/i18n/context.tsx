// frontend/src/i18n/context.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import ko from './ko.json';
import en from './en.json';

const translations: any = { ko, en };

interface I18nContextType {
  lang: 'ko' | 'en';
  setLang: (lang: 'ko' | 'en') => void;
  t: (key: string) => string;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const getInitialTheme = () => {
    const saved = localStorage.getItem('tracelens_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const getInitialLang = () => {
    const saved = localStorage.getItem('tracelens_lang');
    if (saved === 'ko' || saved === 'en') return saved;
    return navigator.language.startsWith('ko') ? 'ko' : 'en';
  };

  const [theme, setThemeState] = useState<'light' | 'dark'>(getInitialTheme);
  const [lang, setLangState] = useState<'ko' | 'en'>(getInitialLang);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('tracelens_theme', newTheme);
  };

  const setLang = (newLang: 'ko' | 'en') => {
    setLangState(newLang);
    localStorage.setItem('tracelens_lang', newLang);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const t = (key: string) => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, theme, setTheme }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
