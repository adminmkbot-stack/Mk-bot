import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversationLanguageService } from '../src/services/conversationLanguageService.js';
import { createLanguageCapabilityRegistry } from '../src/services/languageCapabilities.js';
import { createLanguageProviderRegistry } from '../src/services/languageProviderRegistry.js';
import { TranslationCapabilitiesUnknownError, TranslationPairNotAdvertisedError, TranslationProviderNotConfiguredError, createTranslationService } from '../src/services/translationService.js';
import { SpeechRecognitionCapabilitiesUnknownError, SpeechRecognitionLanguageNotSupportedError, SpeechRecognitionNotConfiguredError, createSpeechRecognitionService } from '../src/services/speechRecognitionService.js';
import { SpeechSynthesisCapabilitiesUnknownError, SpeechSynthesisLanguageNotSupportedError, SpeechSynthesisNotConfiguredError, createSpeechSynthesisService } from '../src/services/speechSynthesisService.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test('response language is selected from detection and preserves original text', async () => {
  let detectedText = '';
  const service = createConversationLanguageService({
    storage: createStorage(),
    detector: { async detectLanguage({ text }) { detectedText = text; return { locale: 'ha' }; } },
  });
  const originalText = 'Sannu, yaya kake?';
  const result = await service.prepareMessage({ originalText, interfaceLanguage: 'en' });
  assert.equal(detectedText, originalText);
  assert.deepEqual(result, { originalText, responseLanguage: 'ha', languageSelection: 'detected' });
});

test('saved response-language preference overrides detection and persists independently', async () => {
  const storage = createStorage();
  const service = createConversationLanguageService({ storage, detector: { async detectLanguage() { return 'ha'; } } });
  assert.equal(service.setPreferredLanguage('ar'), true);
  assert.equal(storage.getItem('mkbot-response-language'), 'ar');
  const restored = createConversationLanguageService({ storage, detector: { async detectLanguage() { return 'ha'; } } });
  assert.equal(restored.preferredLanguage, 'ar');
  assert.deepEqual(await restored.selectResponseLanguage({ originalText: 'hello', interfaceLanguage: 'en' }), { locale: 'ar', source: 'preference' });
});

test('legacy response locale values normalize while interface preference remains separate', async () => {
  const storage = createStorage({ 'mkbot-response-language': 'en-US' });
  const response = createConversationLanguageService({ storage });
  assert.equal(response.preferredLanguage, 'en');
  assert.equal(response.setPreferredLanguage('ha-HA'), true);
  assert.equal(storage.getItem('mkbot-response-language'), 'ha');
});

test('automatic response selection falls back honestly when detection is absent', async () => {
  const service = createConversationLanguageService({ storage: createStorage() });
  assert.deepEqual(await service.selectResponseLanguage({ originalText: 'Bonjour', interfaceLanguage: 'ha' }), { locale: 'ha', source: 'detection-not-configured' });
});

test('detector failures fall back without changing the original message', async () => {
  const service = createConversationLanguageService({ storage: createStorage(), detector: { async detectLanguage() { throw new Error('provider unavailable'); } } });
  const result = await service.prepareMessage({ originalText: '  original text  ', interfaceLanguage: 'en' });
  assert.equal(result.originalText, '  original text  ');
  assert.equal(result.responseLanguage, 'en');
  assert.equal(result.languageSelection, 'interface-fallback');
});

test('capability registry distinguishes UI translation from unconfigured providers', () => {
  const registry = createLanguageCapabilityRegistry();
  const arabic = registry.get('ar');
  assert.equal(arabic.direction, 'rtl');
  assert.equal(arabic.interfaceTranslationAvailable, false);
  assert.equal(arabic.textConversation, 'not-configured');
  assert.equal(arabic.translation, 'not-configured');
  assert.equal(arabic.speechRecognition, 'not-configured');
  assert.equal(arabic.speechSynthesis, 'not-configured');
  const configured = createLanguageCapabilityRegistry({ speechRecognitionProviders: [{ supportedLanguages: ['ha', 'en'] }] });
  assert.equal(configured.get('ha').speechRecognition, 'supported');
  assert.equal(configured.get('ar').speechRecognition, 'unsupported');
});

test('provider selection requires comparable explicit language quality evidence', () => {
  const baseline = {
    benchmarkId: 'ha-dialog-v1', metric: 'human-review-score', score: 0.82,
    sampleCount: 40, evaluatedAt: '2026-10-01T00:00:00Z',
  };
  const providers = [
    { id: 'lower-score', supportedLanguages: ['ha'], qualityEvaluations: { ha: baseline } },
    { id: 'higher-score', supportedLanguages: ['ha'], qualityEvaluations: { ha: { ...baseline, score: 0.91 } } },
    { id: 'unverified', supportedLanguages: ['ha'] },
  ];
  const registry = createLanguageProviderRegistry(providers);
  assert.equal(registry.selectForLanguage('ha', 'ha-dialog-v1', 'human-review-score'), providers[1]);
  assert.equal(registry.selectForLanguage('ar', 'ha-dialog-v1', 'human-review-score'), null);
  assert.equal(registry.selectForLanguage('ha', 'unrelated-benchmark', 'human-review-score'), null);
  assert.equal(registry.selectForLanguage('ha', 'ha-dialog-v1', 'latency'), null);
  assert.equal(registry.selectForLanguage('ha'), null);
  assert.deepEqual(registry.evaluateLanguage('ha').map(({ qualityStatus }) => qualityStatus), ['evaluated', 'evaluated', 'unverified']);
});

test('translation requires a provider and returns both original and translated text', async () => {
  const text = 'Sannu';
  const service = createTranslationService({ supportedPairs: ['ha:en'], translate: async () => ({ text: 'Hello' }) });
  assert.deepEqual(await service.translate({ text, sourceLocale: 'ha', targetLocale: 'en' }), {
    originalText: 'Sannu', translatedText: 'Hello', sourceLocale: 'ha', targetLocale: 'en',
  });
  await assert.rejects(createTranslationService().translate({ text, sourceLocale: 'ha', targetLocale: 'en' }), TranslationProviderNotConfiguredError);
});

test('translation rejects pairs a provider has not explicitly advertised', async () => {
  const provider = { supportedPairs: ['ha:en'], translate: async () => ({ text: 'translated' }) };
  const service = createTranslationService(provider);
  await assert.rejects(service.translate({ text: 'Hello', sourceLocale: 'en', targetLocale: 'ar' }), TranslationPairNotAdvertisedError);
  await assert.rejects(createTranslationService({ translate: provider.translate }).translate({ text: 'Hello', sourceLocale: 'en', targetLocale: 'ha' }), TranslationCapabilitiesUnknownError);
});

test('speech recognition and synthesis are separate and report advertised languages only', async () => {
  const recognition = createSpeechRecognitionService({ supportedLanguages: ['ha'], recognize: async () => 'Sannu' });
  const synthesis = createSpeechSynthesisService({ supportedLanguages: ['en'], speak: async () => 'audio' });
  assert.deepEqual(recognition.supportedLanguages, ['ha']);
  assert.deepEqual(synthesis.supportedLanguages, ['en']);
  assert.equal(await recognition.recognize({ locale: 'ha' }), 'Sannu');
  assert.equal(await synthesis.speak({ locale: 'en', text: 'Hello' }), 'audio');
  await assert.rejects(createSpeechRecognitionService().recognize({}), SpeechRecognitionNotConfiguredError);
  await assert.rejects(createSpeechSynthesisService().speak({}), SpeechSynthesisNotConfiguredError);
  await assert.rejects(recognition.recognize({ locale: 'ar' }), SpeechRecognitionLanguageNotSupportedError);
  await assert.rejects(synthesis.speak({ locale: 'ha', text: 'Sannu' }), SpeechSynthesisLanguageNotSupportedError);
  await assert.rejects(createSpeechRecognitionService({ recognize: async () => '' }).recognize({ locale: 'en' }), SpeechRecognitionCapabilitiesUnknownError);
  await assert.rejects(createSpeechSynthesisService({ speak: async () => '' }).speak({ locale: 'en', text: 'Hello' }), SpeechSynthesisCapabilitiesUnknownError);
});