import { languageCatalog } from '../languageCatalog.js';

function advertisedLanguage(provider, code) {
  if (!Array.isArray(provider.supportedLanguages)) return 'unknown';
  return provider.supportedLanguages.map((language) => String(language).toLowerCase()).includes(code) ? 'supported' : 'unsupported';
}

function combineProviderStatus(providers, code) {
  if (!providers.length) return 'not-configured';
  const statuses = providers.map((provider) => advertisedLanguage(provider, code));
  if (statuses.includes('supported')) return 'supported';
  if (statuses.includes('unknown')) return 'unknown';
  return 'unsupported';
}

export function createLanguageCapabilityRegistry({
  conversationProviders = [],
  translationProviders = [],
  speechRecognitionProviders = [],
  speechSynthesisProviders = [],
} = {}) {
  const registry = languageCatalog.map((language) => Object.freeze({
    ...language,
    textConversation: combineProviderStatus(conversationProviders, language.code),
    translation: combineProviderStatus(translationProviders, language.code),
    speechRecognition: combineProviderStatus(speechRecognitionProviders, language.code),
    speechSynthesis: combineProviderStatus(speechSynthesisProviders, language.code),
  }));
  const byCode = new Map(registry.map((language) => [language.code, language]));

  return Object.freeze({
    languages: Object.freeze(registry),
    get(code) {
      return byCode.get(String(code ?? '').toLowerCase()) ?? null;
    },
    supportsTranslationPair(sourceLocale, targetLocale) {
      return translationProviders.some((provider) => {
        if (typeof provider.supportsPair === 'function') return provider.supportsPair(sourceLocale, targetLocale);
        if (Array.isArray(provider.supportedPairs)) return provider.supportedPairs.includes(`${sourceLocale}:${targetLocale}`);
        return false;
      });
    },
  });
}