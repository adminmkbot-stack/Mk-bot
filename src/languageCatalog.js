const languageCodes = `aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu ckb`.split(' ');

const rightToLeftLanguages = new Set(['ar', 'ckb', 'dv', 'fa', 'he', 'ks', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi']);
const translatedInterfaces = new Set(['en', 'ha']);
const englishNames = new Intl.DisplayNames(['en'], { type: 'language' });
const displayOverrides = {
  ar: { properName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  bn: { properName: 'Bengali', nativeName: 'বাংলা' },
  en: { properName: 'English', nativeName: 'English', locale: 'en' },
  es: { properName: 'Spanish', nativeName: 'Español' },
  fr: { properName: 'French', nativeName: 'Français' },
  ha: { properName: 'Hausa', nativeName: 'Hausa', locale: 'ha-NG' },
  hi: { properName: 'Hindi', nativeName: 'हिन्दी' },
  ig: { properName: 'Igbo', nativeName: 'Igbo' },
  ja: { properName: 'Japanese', nativeName: '日本語' },
  ko: { properName: 'Korean', nativeName: '한국어' },
  pt: { properName: 'Portuguese', nativeName: 'Português' },
  ru: { properName: 'Russian', nativeName: 'Русский' },
  sw: { properName: 'Swahili', nativeName: 'Kiswahili' },
  yo: { properName: 'Yoruba', nativeName: 'Yorùbá' },
  zh: { properName: 'Chinese', nativeName: '中文' },
};

export const languageCatalog = Object.freeze(languageCodes.map((code) => {
  const override = displayOverrides[code] ?? {};
  const properName = override.properName ?? englishNames.of(code) ?? code;
  const nativeName = override.nativeName ?? new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? properName;
  const locale = override.locale ?? code;
  return Object.freeze({
    code,
    locale,
    name: properName,
    properName,
    nativeName,
    direction: override.direction ?? (rightToLeftLanguages.has(code) ? 'rtl' : 'ltr'),
    interfaceTranslationAvailable: translatedInterfaces.has(code),
  });
}));

const languagesByCode = new Map(languageCatalog.map((language) => [language.code, language]));
const legacyAliases = new Map([
  ['ha.ha', 'ha'],
  ['ha.ng', 'ha'],
]);

export function normalizeLanguageCode(value) {
  const input = String(value ?? '').trim().toLowerCase();
  if (languagesByCode.has(input)) return input;
  if (legacyAliases.has(input)) return legacyAliases.get(input);
  try {
    const canonical = new Intl.Locale(input.replaceAll('_', '-')).language.toLowerCase();
    return languagesByCode.has(canonical) ? canonical : null;
  } catch {
    return null;
  }
}

export function getLanguage(code) {
  const normalized = normalizeLanguageCode(code);
  return normalized ? languagesByCode.get(normalized) ?? null : null;
}

function searchKey(value) {
  return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

export function searchLanguages(query, languages = languageCatalog) {
  const normalizedQuery = searchKey(query.trim());
  if (!normalizedQuery) return [...languages];
  return languages.filter((language) => [language.name, language.properName, language.nativeName, language.code, language.locale]
    .some((value) => searchKey(value).includes(normalizedQuery)));
}