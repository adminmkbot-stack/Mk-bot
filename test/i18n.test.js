import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocale, getTranslationKeys, getInterfaceContentLanguage, supportedLanguages } from '../src/i18n.js';
import { getLanguage, languageCatalog, normalizeLanguageCode, searchLanguages } from '../src/languageCatalog.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test('Hausa is the default and translations are available', () => {
  const locale = createLocale(createStorage());
  assert.equal(locale.language, 'ha');
  assert.equal(locale.t('home'), 'Gida');
});

test('language selection is validated and can be restored', () => {
  const storage = createStorage();
  const locale = createLocale(storage);
  assert.equal(locale.setLanguage('en'), true);
  assert.equal(locale.t('home'), 'Home');
  assert.equal(locale.setLanguage('fr'), true);
  assert.equal(locale.t('home'), 'Home');
  assert.equal(getLanguage('fr').interfaceTranslationAvailable, false);
  assert.equal(createLocale(storage).language, 'fr');
  assert.deepEqual(supportedLanguages, ['ha', 'en']);
});

test('legacy locale values restore canonical language preferences', () => {
  const locale = createLocale(createStorage({ 'mkbot-language': 'ha-HA' }));
  assert.equal(locale.language, 'ha');
  assert.equal(locale.t('brand'), 'MK BOT');
});

test('catalog contains searchable-ready locale metadata for over 100 languages', () => {
  assert.ok(languageCatalog.length >= 100);
  assert.equal(new Set(languageCatalog.map((language) => language.code)).size, languageCatalog.length);
  for (const language of languageCatalog) {
    assert.ok(language.locale);
    assert.equal(language.name, language.properName);
    assert.ok(language.properName);
    assert.ok(language.nativeName);
    assert.ok(['ltr', 'rtl'].includes(language.direction));
    assert.equal(typeof language.interfaceTranslationAvailable, 'boolean');
  }
  assert.equal(getLanguage('ha').interfaceTranslationAvailable, true);
  assert.equal(getLanguage('en').interfaceTranslationAvailable, true);
  assert.equal(getLanguage('ar').interfaceTranslationAvailable, false);
  assert.deepEqual(['Hausa', 'English', 'العربية', 'Français', 'Español', 'Português', 'Kiswahili', 'Yorùbá', 'Igbo', '中文', 'हिन्दी', 'বাংলা', '日本語', '한국어', 'Русский'],
    ['ha', 'en', 'ar', 'fr', 'es', 'pt', 'sw', 'yo', 'ig', 'zh', 'hi', 'bn', 'ja', 'ko', 'ru'].map((code) => getLanguage(code).nativeName));
  assert.equal(getLanguage('en-US').nativeName, 'English');
  assert.equal(getLanguage('ha-HA').nativeName, 'Hausa');
  assert.equal(normalizeLanguageCode('ha.ng'), 'ha');
  assert.equal(searchLanguages('العربية').some((language) => language.code === 'ar'), true);
  assert.equal(searchLanguages('Yoruba').some((language) => language.code === 'yo'), true);
});

test('only interface languages with complete UI key sets are marked translated', () => {
  assert.deepEqual(getTranslationKeys('ha'), getTranslationKeys('en'));
  assert.deepEqual(languageCatalog.filter((language) => language.interfaceTranslationAvailable).map((language) => language.code).sort(), [...supportedLanguages].sort());
});

test('Arabic interface fallback sets RTL without claiming Arabic translation', () => {
  const locale = createLocale(createStorage());
  assert.equal(locale.setLanguage('ar'), true);
  assert.equal(locale.direction, 'rtl');
  assert.equal(locale.t('home'), 'Home');
  assert.equal(getInterfaceContentLanguage('ar'), 'en');
  assert.equal(getInterfaceContentLanguage('ha'), 'ha');
  assert.equal(getLanguage(locale.language).interfaceTranslationAvailable, false);
});