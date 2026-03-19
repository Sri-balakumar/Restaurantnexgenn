import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useLanguageStore = create((set) => ({
  language: 'en', // 'en' | 'ar'
  isRTL: false,

  setLanguage: async (lang) => {
    set({ language: lang, isRTL: lang === 'ar' });
    try {
      await AsyncStorage.setItem('app_language', lang);
    } catch (_) {}
  },

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem('app_language');
      if (saved === 'en' || saved === 'ar') {
        set({ language: saved, isRTL: saved === 'ar' });
      }
    } catch (_) {}
  },
}));

export default useLanguageStore;
