import translations from '@constants/translations';
import useLanguageStore from '@stores/language/useLanguageStore';

const useTranslation = () => {
  const language = useLanguageStore((state) => state.language);
  const isRTL = useLanguageStore((state) => state.isRTL);
  const t = translations[language] || translations.en;
  return { t, language, isRTL };
};

export default useTranslation;
