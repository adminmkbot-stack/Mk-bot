import { getLanguage, normalizeLanguageCode } from '../languageCatalog.js';

export function createConversationLanguageService({ detector = null, storage = globalThis.localStorage } = {}) {
  let preferredLanguage = null;
  try {
    const saved = storage?.getItem('mkbot-response-language');
    if (saved === 'auto' || getLanguage(saved)) preferredLanguage = saved === 'auto' ? null : normalizeLanguageCode(saved);
  } catch {
    // Keep automatic language selection when browser storage is unavailable.
  }

  return {
    get preferredLanguage() {
      return preferredLanguage;
    },
    setPreferredLanguage(code) {
      const normalized = code === null || code === 'auto' ? null : normalizeLanguageCode(code);
      if (code !== null && code !== 'auto' && !normalized) return false;
      preferredLanguage = normalized;
      try {
        storage?.setItem('mkbot-response-language', preferredLanguage ?? 'auto');
      } catch {
        // The selected preference remains available for this page session.
      }
      return true;
    },
    async detectLanguage(originalText) {
      if (!detector || typeof detector.detectLanguage !== 'function') return null;
      const result = await detector.detectLanguage({ text: originalText });
      const code = typeof result === 'string' ? result : result?.locale;
      return getLanguage(code) ? code : null;
    },
    async selectResponseLanguage({ originalText, interfaceLanguage }) {
      if (preferredLanguage) return { locale: preferredLanguage, source: 'preference' };
      let detectedLanguage = null;
      try {
        detectedLanguage = await this.detectLanguage(originalText);
      } catch {
        // A detector outage must not prevent sending the original message.
      }
      if (detectedLanguage) return { locale: detectedLanguage, source: 'detected' };
      return { locale: getLanguage(interfaceLanguage)?.code ?? 'en', source: detector ? 'interface-fallback' : 'detection-not-configured' };
    },
    async prepareMessage({ originalText, interfaceLanguage }) {
      const response = await this.selectResponseLanguage({ originalText, interfaceLanguage });
      return { originalText, responseLanguage: response.locale, languageSelection: response.source };
    },
  };
}