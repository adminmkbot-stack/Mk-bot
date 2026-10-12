import { createLocale, getInterfaceContentLanguage } from './i18n.js';
import { createChatService, AIProviderNotConfiguredError, AIProviderLanguageCapabilitiesUnknownError, AIProviderLanguageNotSupportedError } from './services/chatService.js';
import { createMemoryService } from './services/memoryService.js';
import { languageCatalog } from './languageCatalog.js';
import { createConversationLanguageService } from './services/conversationLanguageService.js';
import { createLanguageCapabilityRegistry } from './services/languageCapabilities.js';
import { createTranslationService, TranslationProviderNotConfiguredError } from './services/translationService.js';
import { createConversationRepository } from './services/conversationRepository.js';
import { activateDrawerFromLogo, createNavigationDrawer } from './services/navigationDrawer.js';
import { createThemeService } from './services/themeService.js';
import { resolveNavigationView } from './services/navigationRoutes.js';

const app = document.querySelector('#app');
if (!app) throw new Error('MK BOT could not start: the #app root element is missing.');
const developmentMode = ['localhost', '127.0.0.1', '::1'].includes(globalThis.location?.hostname);
const appEventHandlers = app.__mkbotEventHandlers ?? (app.__mkbotEventHandlers = new Map());

function registerAppEvent(type, handler) {
  const previousHandler = appEventHandlers.get(type);
  if (previousHandler) {
    app.removeEventListener(type, previousHandler);
    if (developmentMode) console.warn(`[MK BOT] Replacing duplicate ${type} event handler.`);
  }
  appEventHandlers.set(type, handler);
  app.addEventListener(type, handler);
}

if (developmentMode && !globalThis.__mkbotDiagnosticHandlers) {
  globalThis.__mkbotDiagnosticHandlers = true;
  globalThis.addEventListener('error', (event) => console.error('[MK BOT] Browser error:', event.error ?? event.message));
  globalThis.addEventListener('unhandledrejection', (event) => console.error('[MK BOT] Unhandled promise rejection:', event.reason));
}
const locale = createLocale();
const chatService = createChatService();
const memoryService = createMemoryService();
const conversationLanguage = createConversationLanguageService();
const languageCapabilities = createLanguageCapabilityRegistry();
const translationService = createTranslationService();
const conversationRepository = createConversationRepository();
const themeService = createThemeService();
const drawerController = createNavigationDrawer({
  getDialog: () => document.querySelector('#navigation-drawer'),
  getInitialFocus: () => document.querySelector('#conversation-search'),
  getActiveElement: () => document.activeElement,
});
const state = {
  view: 'splash',
  conversations: [],
  activeConversationId: null,
  pending: false,
  notice: '',
  quizChoice: '',
  quizResult: '',
  translationSource: 'ha',
  translationTarget: 'en',
  translationText: '',
  translationResult: '',
  translationPending: false,
  conversationSearch: '',
};

const icons = {
  robot: '<rect x="5" y="8" width="14" height="12" rx="4"/><path d="M12 4v4m-4 5h.01M16 13h.01M9 17h6M3 12h2m14 0h2M8 20v1m8-1v1"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  learn: '<path d="M12 7v14m0-14C8 4 4 5 3 6v14c1-1 5-2 9 1m0-14c4-3 8-2 9-1v14c-1-1-5-2-9 1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/>',
  plus: '<path d="M12 5v14m-7-7h14"/>',
  send: '<path d="m22 2-7 20-4-9-9-4zm0 0L11 13"/>',
  arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20m-10-10a15 15 0 0 1 0 20m0-20a15 15 0 0 0 0 20"/>',
  spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3zm7 11 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/>',
};

function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function normalizeSearchText(value) {
  return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

function greeting() {
  const hour = new Date().getHours();
  return locale.t(hour < 12 ? 'greetingMorning' : hour < 17 ? 'greetingAfternoon' : 'greetingEvening');
}

function activeConversation() {
  return state.conversations.find((conversation) => conversation.id === state.activeConversationId);
}

function openDrawer(trigger) {
  return activateDrawerFromLogo(trigger, drawerController);
}

function closeDrawer() {
  drawerController.close();
}

function bindDrawerEvents() {
  const dialog = document.querySelector('#navigation-drawer');
  if (!dialog) return;
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDrawer();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDrawer();
  });
}

function languageControl(kind = 'interface') {
  const responseLanguage = kind === 'response';
  const interfaceLanguage = kind === 'interface';
  const selectedCode = responseLanguage
    ? conversationLanguage.preferredLanguage
    : interfaceLanguage ? locale.language : state[kind === 'translation-source' ? 'translationSource' : 'translationTarget'];
  const selectedLanguage = languageCatalog.find((language) => language.code === selectedCode);
  const summary = responseLanguage
    ? selectedLanguage?.nativeName ?? locale.t('automatic')
    : selectedLanguage?.nativeName ?? selectedCode.toUpperCase();
  const languageOptionDisabled = state.translationPending && (kind === 'translation-source' || kind === 'translation-target') ? 'disabled' : '';
  const options = languageCatalog.map((language) => {
    const status = language.interfaceTranslationAvailable ? locale.t('translatedInterface') : locale.t('englishFallback');
    const searchable = normalizeSearchText(`${language.name} ${language.properName} ${language.nativeName} ${language.code} ${language.locale}`);
    return `<button type="button" role="option" aria-selected="${language.code === selectedCode}" class="language-option" ${languageOptionDisabled} data-select-language="${language.code}" data-language-kind="${kind}" data-search-value="${escapeHtml(searchable)}"><span class="language-option-names" dir="auto"><strong>${escapeHtml(language.nativeName)}</strong><small>${escapeHtml(language.properName)}</small></span>${interfaceLanguage ? `<span class="language-status ${language.interfaceTranslationAvailable ? 'is-translated' : 'is-fallback'}">${status}</span>` : ''}</button>`;
  }).join('');
  const autoOption = responseLanguage ? `<button type="button" role="option" aria-selected="${selectedCode === null}" class="language-option automatic-option" data-select-language="auto" data-language-kind="response" data-search-value="automatic from your message auto"><span class="language-option-names"><strong>${locale.t('automatic')}</strong><small>Auto</small></span></button>` : '';
  const label = responseLanguage ? locale.t('responseLanguage') : interfaceLanguage ? locale.t('interfaceLanguages') : locale.t(kind === 'translation-source' ? 'sourceLanguage' : 'targetLanguage');
  return `<details class="language-picker"><summary aria-label="${escapeHtml(label)}"><span class="language-picker-trigger">${icon('globe')}<span>${escapeHtml(summary)}</span></span></summary><div class="language-picker-panel"><label class="language-search-wrap"><span class="sr-only">${locale.t('searchLanguages')}</span><input type="search" data-language-search placeholder="${locale.t('searchLanguages')}" autocomplete="off" /></label><div class="language-picker-list" role="listbox" aria-label="${escapeHtml(label)}">${autoOption}${options}</div></div></details>`;
}

function brand() {
  return `<span class="brand-mark">${icon('robot')}</span><span class="brand-copy"><strong>MK BOT</strong><small>${locale.t('tagline')}</small></span>`;
}

function renderSplash() {
  return `<main class="auth-layout splash-layout"><div class="auth-art"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="robot-stage"><span class="robot-face">${icon('robot')}</span><i class="status-dot"></i></div><div class="art-caption"><span>01 / 04</span><span>${locale.t('tagline')}</span></div></div><section class="auth-panel"><header class="auth-top">${brand()}${languageControl()}</header><div class="auth-content"><p class="eyebrow">${locale.t('tagline')}</p><h1>${locale.t('brand')}<span class="title-period">.</span></h1><p class="auth-intro">${locale.t('ready')}</p><button class="button button-primary button-wide" data-view="login">${locale.t('login')} ${icon('arrow')}</button><button class="button button-outline button-wide" data-view="signup">${locale.t('signup')}</button><button class="text-button guest-link" data-guest>${locale.t('guest')}</button></div><p class="auth-footer">Hausa <span>·</span> English</p></section></main>`;
}

function renderAuth() {
  const signup = state.view === 'signup';
  return `<main class="auth-layout auth-form-layout"><section class="auth-panel auth-card"><header class="auth-top"><button class="brand-button" data-view="splash">${brand()}</button>${languageControl()}</header><div class="auth-content"><button class="back-link" data-view="splash">${icon('arrow')} ${locale.t('back')}</button><p class="eyebrow">${locale.t('brand')}</p><h1>${signup ? locale.t('welcomeNew') : locale.t('welcome')}</h1><p class="muted">${locale.t('authDescription')}</p><form data-auth-form class="stack-form">${signup ? `<label>${locale.t('fullName')}<input name="name" autocomplete="name" required maxlength="80" /></label>` : ''}<label>${locale.t('email')}<input name="email" type="email" autocomplete="email" required /></label><label>${locale.t('password')}<input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required /></label><p class="inline-notice">${locale.t('authUnavailable')}</p><button class="button button-primary button-wide" type="submit">${signup ? locale.t('createAccount') : locale.t('continue')} ${icon('arrow')}</button></form><p class="auth-switch">${signup ? locale.t('haveAccount') : locale.t('noAccount')} <button class="text-button" data-view="${signup ? 'login' : 'signup'}">${signup ? locale.t('login') : locale.t('signup')}</button></p><button class="text-button guest-link" data-guest>${locale.t('guest')}</button></div></section><div class="auth-side-note">${icon('robot')} <span>${locale.t('tagline')}</span></div></main>`;
}

const navItems = [
  { view: 'dashboard', key: 'home', icon: 'home' },
  { view: 'chats', key: 'chats', icon: 'chat' },
  { view: 'learn', key: 'learn', icon: 'learn' },
  { view: 'profile', key: 'me', icon: 'user' },
];

function renderNav() {
  return navItems.map((item) => `<button type="button" class="nav-item ${state.view === item.view ? 'active' : ''}" data-view="${item.view}" ${state.view === item.view ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${locale.t(item.key)}</span></button>`).join('');
}

function renderDrawerHistory() {
  if (!state.conversations.length) return `<p class="drawer-empty" data-empty-history>${locale.t('noConversations')}</p>`;
  return [...state.conversations].reverse().map((conversation) => `<button type="button" class="drawer-conversation ${state.activeConversationId === conversation.id ? 'is-active' : ''}" data-open-chat="${escapeHtml(conversation.id)}"><span class="conversation-avatar">${icon('robot')}</span><span><strong>${escapeHtml(conversation.title || locale.t('chatTitle'))}</strong><small>${escapeHtml(conversation.messages.at(-1)?.content || locale.t('chatWelcome'))}</small></span></button>`).join('');
}

function renderDrawer() {
  const themeOptions = ['light', 'dark', 'system'].map((theme) => `<button type="button" data-theme-choice="${theme}" aria-pressed="${themeService.theme === theme}">${locale.t(theme)}</button>`).join('');
  const account = state.user
    ? `<button class="drawer-account-action" data-view="profile">${locale.t('me')}</button><button class="drawer-account-action" data-signout>${locale.t('signOut')}</button>`
    : `<span class="drawer-account-status">${locale.t('guestAccount')} · ${locale.t('localOnlyChats')}</span><button class="drawer-account-action" data-view="login">${locale.t('signIn')}</button>`;
  return `<dialog id="navigation-drawer" class="navigation-drawer" aria-label="${locale.t('menu')}"
    ><div class="drawer-content">
      <header class="drawer-brand-row"><span class="brand-link">${brand()}</span><button type="button" class="icon-button drawer-close" data-close-drawer aria-label="${locale.t('closeMenu')}" title="${locale.t('closeMenu')}">${icon('close')}</button></header>
      <button type="button" class="button button-primary drawer-new-chat" data-new-chat>${icon('plus')} ${locale.t('newChat')}</button>
      <label class="drawer-search"><span class="sr-only">${locale.t('searchConversations')}</span>${icon('search')}<input id="conversation-search" type="search" data-conversation-search placeholder="${locale.t('searchConversations')}" value="${escapeHtml(state.conversationSearch)}" /></label>
      <section class="drawer-history"><p class="drawer-section-label">${locale.t('recent')}</p><div class="drawer-conversation-list">${renderDrawerHistory()}</div></section>
      <nav class="drawer-navigation" aria-label="${locale.t('learn')}">
        <button type="button" data-view="learn">${icon('learn')}<span>${locale.t('learn')}</span></button>
        <button type="button" data-view="research">${icon('search')}<span>${locale.t('research')}</span></button>
        <button type="button" data-open-settings>${icon('settings')}<span>${locale.t('settings')}</span></button>
      </nav>
      <section id="drawer-settings" class="drawer-settings"><p class="drawer-section-label">${locale.t('settings')}</p>
        <div class="drawer-setting-row"><span>${locale.t('theme')}</span><div class="theme-options" role="group" aria-label="${locale.t('theme')}">${themeOptions}</div></div>
        <div class="drawer-setting-row"><span>${locale.t('interfaceLanguages')}</span>${languageControl('interface')}</div>
        <div class="drawer-setting-row"><span>${locale.t('responseLanguage')}</span>${languageControl('response')}</div>
      </section>
      <footer class="drawer-footer"><span class="avatar">${state.user ? 'U' : 'G'}</span><span class="drawer-account-copy">${account}</span></footer>
    </div>
  </dialog>`;
}

function renderShell(content) {
  return `<div class="app-shell"><div class="workspace"><header class="topbar"><button type="button" class="brand-button mobile-brand" data-open-drawer aria-label="${locale.t('menu')}" aria-haspopup="dialog" aria-controls="navigation-drawer">${brand()}</button><div class="topbar-actions"><button class="icon-button notification-button" data-notifications aria-label="${locale.t('notification')}" title="${locale.t('notification')}">${icon('bell')}<span class="notification-dot"></span></button><button class="avatar avatar-button" data-view="profile" aria-label="${locale.t('me')}">M</button></div></header><main class="page-content">${content}</main><nav class="mobile-nav" aria-label="${locale.t('home')}">${renderNav()}</nav></div>${renderDrawer()}<button class="floating-action" data-new-chat aria-label="${locale.t('newChat')}" title="${locale.t('newChat')}">${icon('plus')}</button>${state.notice ? `<div class="toast" role="status">${escapeHtml(state.notice)}</div>` : ''}</div>`;
}

function renderDashboard() {
  const chatsToday = state.conversations.length;
  const memories = memoryService.list();
  const conversations = [...state.conversations].reverse();
  return `<section class="welcome-row"><div><p class="eyebrow">${new Intl.DateTimeFormat(getInterfaceContentLanguage(locale.language), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p><h1>${greeting()}, <span class="greeting-name">${locale.t('guestAccount')}</span></h1><p class="welcome-subtitle">${locale.t('ready')}</p></div><button class="button button-primary desktop-new-chat" data-new-chat>${icon('plus')} ${locale.t('newChat')}</button></section><section class="stat-grid" aria-label="${locale.t('chatsToday')}"><article class="stat-card"><span class="stat-icon blue-soft">${icon('chat')}</span><div><span class="stat-label">${locale.t('chatsToday')}</span><strong>${chatsToday}</strong><small>${locale.language === 'ha' ? 'A wannan zaman' : 'In this session'}</small></div><span class="stat-ornament">${icon('chat')}</span></article><article class="stat-card"><span class="stat-icon mint-soft">${icon('learn')}</span><div><span class="stat-label">${locale.t('savedMemories')}</span><strong>${memories.length}</strong><small>${locale.language === 'ha' ? 'Abubuwan da ka shigar' : 'Added by you'}</small></div><span class="stat-ornament">${icon('spark')}</span></article></section><section class="dashboard-grid"><div class="section-block conversation-section"><div class="section-heading"><div><p class="eyebrow">MK BOT</p><h2>${locale.t('todayConversations')}</h2></div><button class="subtle-link" data-view="chats">${locale.t('chats')} ${icon('arrow')}</button></div>${conversations.length ? `<div class="conversation-list">${conversations.map((conversation) => `<button class="conversation-row" data-open-chat="${conversation.id}"><span class="conversation-avatar">${icon('robot')}</span><span class="conversation-copy"><strong>${escapeHtml(conversation.title || locale.t('chatTitle'))}</strong><small>${escapeHtml(conversation.messages.at(-1)?.content || locale.t('chatWelcome'))}</small></span><span class="conversation-time">${new Intl.DateTimeFormat(getInterfaceContentLanguage(locale.language), { hour: '2-digit', minute: '2-digit' }).format(conversation.createdAt)}</span>${icon('arrow', 'row-arrow')}</button>`).join('')}</div>` : `<div class="empty-conversations"><span class="empty-icon">${icon('chat')}</span><div><strong>${locale.t('noConversations')}</strong><button class="text-button" data-new-chat>${locale.t('startChat')} ${icon('arrow')}</button></div></div>`}</div><aside class="daily-card"><div class="daily-illustration"><span class="daily-spark">${icon('spark')}</span><span class="daily-robot">${icon('robot')}</span><span class="daily-orbit"></span></div><p class="eyebrow">${locale.t('learn')}</p><h2>${locale.t('quiz')}</h2><p>${locale.t('quizDescription')}</p><button class="button button-dark" data-view="learn">${locale.t('continue')} ${icon('arrow')}</button></aside></section>`;
}

function renderMessages(conversation) {
  if (!conversation?.messages.length) {
    return `<div class="chat-empty"><span class="chat-empty-mark">${icon('robot')}</span><h2>${locale.t('chatWelcome')}</h2><p>${locale.t('chatHint')}</p><div class="suggestion-chips"><button data-suggestion="${escapeHtml(locale.language === 'ha' ? 'Ka taimaka min in tsara ranata' : 'Help me plan my day')}">${locale.language === 'ha' ? 'Tsara ranata' : 'Plan my day'}</button><button data-suggestion="${escapeHtml(locale.language === 'ha' ? 'Ina so in koyi sabon abu' : 'I want to learn something new')}">${locale.language === 'ha' ? 'Koyi wani abu' : 'Learn something new'}</button></div></div>`;
  }
  return conversation.messages.map((message) => `<article class="message ${message.role === 'user' ? 'message-user' : 'message-assistant'}"><span class="message-avatar">${message.role === 'user' ? 'M' : icon('robot')}</span><div class="message-body"><span class="message-author">${message.role === 'user' ? locale.t('guestAccount') : 'MK BOT'}</span><p dir="auto">${escapeHtml(message.content)}</p></div></article>`).join('') + (state.pending ? `<div class="message message-assistant"><span class="message-avatar">${icon('robot')}</span><div class="message-body"><span class="message-author">MK BOT</span><div class="typing-indicator" aria-label="Loading"><i></i><i></i><i></i></div></div></div>` : '');
}

function renderChats() {
  const conversation = activeConversation();
  return `<section class="page-heading chat-page-heading"><div><p class="eyebrow">MK BOT</p><h1>${locale.t('chats')}</h1><p>${locale.t('chatHint')}</p></div><button class="button button-primary" data-new-chat>${icon('plus')} ${locale.t('newChat')}</button></section><section class="chat-panel"><div class="chat-thread-header"><span class="conversation-avatar">${icon('robot')}</span><div><strong>${escapeHtml(conversation?.title || locale.t('chatTitle'))}</strong><small><i class="online-dot"></i> ${locale.t('ready')}</small></div></div><div class="chat-messages" id="chat-messages">${renderMessages(conversation)}</div><form class="chat-composer" data-chat-form><label class="sr-only" for="chat-input">${locale.t('chatPlaceholder')}</label><textarea id="chat-input" name="message" dir="auto" rows="1" maxlength="2000" placeholder="${locale.t('chatPlaceholder')}" required ${state.pending ? 'disabled' : ''}></textarea><button class="send-button" type="submit" aria-label="${locale.t('send')}" title="${locale.t('send')}" ${state.pending ? 'disabled' : ''}>${icon('send')}</button></form><p class="chat-disclaimer">${locale.language === 'ha' ? 'Kada ka aika bayanan sirri.' : 'Please do not share sensitive personal information.'}</p></section>`;
}

function renderMemoryList() {
  const memories = memoryService.list();
  const categoryLabel = { preference: 'preference', topic: 'topic', pattern: 'pattern', language: 'languagePreference' };
  return memories.length ? `<ul class="memory-list">${memories.map((memory) => `<li><span><small>${locale.t(categoryLabel[memory.category])}</small><strong>${escapeHtml(memory.content)}</strong></span><button class="icon-button delete-memory" data-delete-memory="${escapeHtml(memory.id)}" aria-label="${locale.t('deleteMemory')}" title="${locale.t('deleteMemory')}">${icon('trash')}</button></li>`).join('')}</ul>` : `<p class="empty-note">${locale.t('noMemories')}</p>`;
}

function renderTranslationTool() {
  return `<section class="learn-panel translation-panel"><div class="panel-heading"><span class="stat-icon blue-soft">${icon('globe')}</span><div><h2>${locale.t('textTranslation')}</h2><p>${locale.t('translationHint')}</p></div></div><form data-translation-form><div class="translation-language-row">${languageControl('translation-source')}<span aria-hidden="true">→</span>${languageControl('translation-target')}</div><label class="translation-input-label">${locale.t('translationInput')}<textarea name="text" data-translation-text dir="auto" maxlength="4000" rows="4" required ${state.translationPending ? 'disabled' : ''} placeholder="${locale.t('translationPlaceholder')}">${escapeHtml(state.translationText)}</textarea></label><button class="button button-primary" type="submit" ${state.translationPending ? 'disabled' : ''}>${state.translationPending ? locale.t('loading') : locale.t('translate')} ${icon('arrow')}</button></form><p class="translation-result" role="status" dir="auto">${escapeHtml(state.translationResult || locale.t('translationUnavailable'))}</p></section>`;
}

function renderLearn() {
  return `<section class="page-heading"><div><p class="eyebrow">${locale.t('learn')}</p><h1>${locale.t('learnTitle')}</h1><p>${locale.t('learnSubtitle')}</p></div></section><section class="learn-grid"><article class="learn-panel memory-panel"><div class="panel-heading"><span class="stat-icon mint-soft">${icon('learn')}</span><div><h2>${locale.t('memories')}</h2><p>${locale.t('learnSubtitle')}</p></div></div><form class="memory-form" data-memory-form><label>${locale.t('memoryCategory')}<select name="category"><option value="preference">${locale.t('preference')}</option><option value="topic">${locale.t('topic')}</option><option value="pattern">${locale.t('pattern')}</option></select></label><label>${locale.t('addMemory')}<textarea name="content" maxlength="240" rows="2" placeholder="${locale.t('memoryPlaceholder')}" required></textarea></label><button class="button button-primary" type="submit">${icon('plus')} ${locale.t('addMemory')}</button></form><div class="memory-list-wrap" id="memory-list">${renderMemoryList()}</div></article><article class="learn-panel quiz-panel"><div class="quiz-art">${icon('spark')}<span>?</span></div><p class="eyebrow">${locale.t('learn')}</p><h2>${locale.t('quiz')}</h2><p>${locale.t('quizDescription')}</p><fieldset class="quiz-options"><legend>${locale.t('question')}</legend><label class="quiz-option"><input type="radio" name="quiz" value="ha" ${state.quizChoice === 'ha' ? 'checked' : ''} /><span>${locale.t('answerHausa')}</span></label><label class="quiz-option"><input type="radio" name="quiz" value="en" ${state.quizChoice === 'en' ? 'checked' : ''} /><span>${locale.t('answerEnglish')}</span></label></fieldset><p class="quiz-result" role="status">${state.quizResult}</p><button class="button button-dark" data-check-quiz>${locale.t('checkAnswer')} ${icon('arrow')}</button></article></section>${renderTranslationTool()}`;
}

function renderResearch() {
  return `<section class="page-heading"><div><p class="eyebrow">${locale.t('brand')}</p><h1>${locale.t('research')}</h1><p>${locale.t('researchUnavailable')}</p></div></section><section class="research-empty"><span class="chat-empty-mark">${icon('search')}</span><h2>${locale.t('research')}</h2><p>${locale.t('researchUnavailable')}</p></section>`;
}

function renderProfile() {
  const capabilityCode = conversationLanguage.preferredLanguage ?? locale.language;
  const capability = languageCapabilities.get(capabilityCode);
  const capabilityRows = ['textConversation', 'translation', 'speechRecognition', 'speechSynthesis'].map((key) => {
    const value = capability[key];
    const label = value === 'not-configured' ? locale.t('notConfigured') : value === 'supported' ? locale.t('supported') : value === 'unsupported' ? locale.t('unsupported') : locale.t('unknown');
    return `<div class="capability-row"><dt>${locale.t(key)}</dt><dd>${label}</dd></div>`;
  }).join('');
  const capabilityLanguage = languageCatalog.find((language) => language.code === capabilityCode);
  return `<section class="page-heading"><div><p class="eyebrow">${locale.t('me')}</p><h1>${locale.t('profileTitle')}</h1></div></section><section class="profile-layout"><article class="profile-card"><div class="profile-identity"><span class="profile-avatar">M</span><div><h2>${locale.t('guestAccount')}</h2><p>${locale.t('guestDescription')}</p></div></div><div class="profile-setting"><span class="setting-icon">${icon('globe')}</span><div class="setting-copy"><strong>${locale.t('interfaceLanguages')}</strong><small>${languageCatalog.find((language) => language.code === locale.language)?.nativeName}</small></div><button type="button" class="text-button" data-open-drawer>${locale.t('settings')} ${icon('arrow')}</button></div><div class="profile-setting"><span class="setting-icon">${icon('user')}</span><div class="setting-copy"><strong>${locale.t('dataPrivacy')}</strong><small>${locale.t('privacyDescription')}</small></div></div><div class="profile-actions"><button class="button button-outline" data-signout>${locale.t('signOut')} ${icon('arrow')}</button><button class="text-button" data-view="learn">${locale.t('memories')}</button></div></article><aside class="account-note"><span>${icon('robot')}</span><strong>${locale.t('brand')}</strong><p>${locale.t('authUnavailable')}</p><button class="text-button" data-view="login">${locale.t('login')} ${icon('arrow')}</button></aside></section><section class="capability-panel"><div><p class="eyebrow">${locale.t('responseLanguage')}</p><h2>${locale.t('languageCapabilities')}</h2><p>${escapeHtml(capabilityLanguage?.nativeName ?? capabilityLanguage?.properName ?? capabilityCode)}</p></div><dl class="capability-list">${capabilityRows}</dl></section>`;
}

function render() {
  const drawerWasOpen = document.querySelector('#navigation-drawer')?.open ?? false;
  document.documentElement.lang = getInterfaceContentLanguage(locale.language);
  document.documentElement.dir = locale.direction;
  document.documentElement.dataset.theme = themeService.theme;
  if (state.view === 'splash') app.innerHTML = renderSplash();
  else if (state.view === 'login' || state.view === 'signup') app.innerHTML = renderAuth();
  else {
    const pages = { dashboard: renderDashboard, chats: renderChats, learn: renderLearn, research: renderResearch, profile: renderProfile };
    app.innerHTML = renderShell((pages[state.view] || renderDashboard)());
    bindDrawerEvents();
    if (drawerWasOpen) document.querySelector('#navigation-drawer')?.showModal();
    const messages = document.querySelector('#chat-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }
}

function setView(view) {
  const validView = resolveNavigationView({ dataset: { view } });
  if (!validView) {
    if (developmentMode) console.warn(`[MK BOT] Ignoring unknown navigation view: ${String(view)}`);
    return false;
  }
  state.view = validView;
  state.notice = '';
  render();
  return true;
}

async function startNewChat() {
  try {
    closeDrawer();
    const conversation = await conversationRepository.create();
    state.conversations = await conversationRepository.list();
    state.activeConversationId = conversation.id;
    state.conversationSearch = '';
    setView('chats');
    document.querySelector('#chat-input')?.focus();
  } catch {
    state.notice = locale.t('conversationSaveError');
    render();
  }
}

async function openConversation(id) {
  try {
    const conversation = await conversationRepository.get(id);
    if (!conversation) return;
    state.conversations = await conversationRepository.list();
    state.activeConversationId = conversation.id;
    closeDrawer();
    setView('chats');
  } catch {
    state.notice = locale.t('conversationSaveError');
    render();
  }
}

async function restoreConversations() {
  try {
    state.conversations = await conversationRepository.list();
    return true;
  } catch {
    state.notice = locale.t('conversationSaveError');
    return false;
  }
}

async function submitMessage(form) {
  const conversation = activeConversation() || (() => {
    const created = { id: `${Date.now()}`, title: '', createdAt: new Date(), messages: [] };
    state.conversations.push(created);
    state.activeConversationId = created.id;
    return created;
  })();
  const input = form.elements.message;
  const content = input.value;
  if (!content.trim() || state.pending) return;
  conversation.messages.push({ role: 'user', content, createdAt: new Date() });
  if (!conversation.title) conversation.title = content.trim().slice(0, 54);
  state.pending = true;
  render();
  try {
    await conversationRepository.save(conversation);
    const preparedMessage = await conversationLanguage.prepareMessage({ originalText: content, interfaceLanguage: locale.language });
    const reply = await chatService.sendMessage({
      messages: conversation.messages.map(({ role, content: text }) => ({ role, content: text })),
      responseLanguage: preparedMessage.responseLanguage,
    });
    if (!reply || typeof reply.content !== 'string') throw new TypeError('The AI provider returned an invalid reply.');
    conversation.messages.push({ role: 'assistant', content: reply.content, createdAt: new Date() });
  } catch (error) {
    conversation.messages.push({
      role: 'assistant',
      content: error instanceof AIProviderNotConfiguredError
        ? locale.t('aiUnavailable')
        : error instanceof AIProviderLanguageNotSupportedError
          ? locale.t('responseLanguageUnsupported')
          : error instanceof AIProviderLanguageCapabilitiesUnknownError
            ? locale.t('languageCapabilitiesUnknown')
            : locale.t('chatError'),
      createdAt: new Date(),
    });
  } finally {
    state.pending = false;
    try {
      await conversationRepository.save(conversation);
      state.conversations = await conversationRepository.list();
    } catch {
      state.notice = locale.t('conversationSaveError');
    }
    render();
    document.querySelector('#chat-input')?.focus();
  }
}

registerAppEvent('click', async (event) => {
  const eventTarget = event.target instanceof Element ? event.target : event.target?.parentElement;
  const target = eventTarget?.closest('button, a[data-view]');
  if (!target) return;
  if (target.tagName === 'A') event.preventDefault();
  if (activateDrawerFromLogo(target, drawerController)) return;
  if (target.hasAttribute('data-close-drawer')) {
    closeDrawer();
    return;
  }
  if (target.hasAttribute('data-open-settings')) {
    const dialog = document.querySelector('#navigation-drawer');
    if (!dialog?.open) drawerController.open(target);
    const settings = document.querySelector('#drawer-settings');
    if (!settings) {
      if (developmentMode) console.error('[MK BOT] Drawer settings section is missing.');
      return;
    }
    settings.scrollIntoView({ block: 'nearest' });
    settings.querySelector('.language-picker > summary')?.focus();
    return;
  }
  if (target.dataset.themeChoice) {
    themeService.setTheme(target.dataset.themeChoice);
    document.documentElement.dataset.theme = themeService.theme;
    app.querySelectorAll('[data-theme-choice]').forEach((option) => {
      option.setAttribute('aria-pressed', String(option.dataset.themeChoice === themeService.theme));
    });
    return;
  }
  if (target.dataset.selectLanguage) {
    const { selectLanguage: code, languageKind: kind } = target.dataset;
    target.closest('.language-picker')?.removeAttribute('open');
    if (kind === 'response') {
      conversationLanguage.setPreferredLanguage(code);
      state.notice = locale.t('languageUpdated');
    } else if (kind === 'translation-source' || kind === 'translation-target') {
      state[kind === 'translation-source' ? 'translationSource' : 'translationTarget'] = code;
      state.translationResult = '';
    } else {
      locale.setLanguage(code);
      state.notice = languageCatalog.find((language) => language.code === code)?.interfaceTranslationAvailable
        ? locale.t('languageUpdated')
        : locale.t('englishFallback');
    }
    render();
    return;
  }
  const view = resolveNavigationView(target);
  if (target.dataset.view && !view && developmentMode) console.warn(`[MK BOT] Ignoring unknown navigation target: ${target.dataset.view}`);
  if (view) {
    closeDrawer();
    setView(view);
  }
  if (target.hasAttribute('data-guest')) {
    await restoreConversations();
    setView('dashboard');
  }
  if (target.hasAttribute('data-new-chat')) await startNewChat();
  if (target.dataset.openChat) {
    await openConversation(target.dataset.openChat);
  }
  if (target.hasAttribute('data-notifications')) {
    state.notice = locale.t('noNotifications');
    render();
  }
  if (target.dataset.deleteMemory) {
    memoryService.remove(target.dataset.deleteMemory);
    state.notice = locale.t('memoryDeleted');
    render();
  }
  if (target.hasAttribute('data-signout')) setView('splash');
  if (target.dataset.suggestion) {
    const input = document.querySelector('#chat-input');
    if (input) {
      input.value = target.dataset.suggestion;
      input.focus();
    }
  }
  if (target.hasAttribute('data-check-quiz')) {
    state.quizResult = state.quizChoice ? locale.t('quizCorrect') : locale.t('quizTryAgain');
    render();
  }
});

registerAppEvent('input', (event) => {
  if (event.target.matches('[data-language-search]')) {
    const query = normalizeSearchText(event.target.value.trim());
    event.target.closest('.language-picker-panel').querySelectorAll('.language-option').forEach((option) => {
      option.hidden = !option.dataset.searchValue.includes(query);
    });
  }
  if (event.target.matches('[data-conversation-search]')) {
    state.conversationSearch = event.target.value;
    const query = normalizeSearchText(state.conversationSearch);
    const conversations = [...app.querySelectorAll('.drawer-conversation')];
    for (const conversation of conversations) {
      const title = conversation.querySelector('strong')?.textContent ?? '';
      const detail = conversation.querySelector('small')?.textContent ?? '';
      conversation.hidden = !normalizeSearchText(`${title} ${detail}`).includes(query);
    }
    const empty = app.querySelector('[data-no-search-results]');
    if (empty) empty.hidden = conversations.length === 0 || conversations.some((conversation) => !conversation.hidden);
    const emptyHistory = app.querySelector('[data-empty-history]');
    if (emptyHistory) emptyHistory.textContent = query ? locale.t('noSearchResults') : locale.t('noConversations');
  }
  if (event.target.matches('[data-translation-text]')) state.translationText = event.target.value;
});

registerAppEvent('submit', async (event) => {
  event.preventDefault();
  if (event.target.matches('[data-auth-form]')) {
    state.notice = locale.t('authUnavailable');
    render();
    return;
  }
  if (event.target.matches('[data-chat-form]')) {
    await submitMessage(event.target);
    return;
  }
  if (event.target.matches('[data-translation-form]')) {
    state.translationText = event.target.elements.text.value;
    state.translationResult = '';
    state.translationPending = true;
    render();
    try {
      const result = await translationService.translate({
        text: state.translationText,
        sourceLocale: state.translationSource,
        targetLocale: state.translationTarget,
      });
      state.translationResult = result.translatedText;
    } catch (error) {
      state.translationResult = error instanceof TranslationProviderNotConfiguredError
        ? locale.t('translationUnavailable')
        : locale.t('translationError');
    } finally {
      state.translationPending = false;
      render();
    }
    return;
  }
  if (event.target.matches('[data-memory-form]')) {
    const form = event.target;
    try {
      memoryService.add({ category: form.elements.category.value, content: form.elements.content.value });
      state.notice = locale.t('memorySaved');
      render();
    } catch (error) {
      state.notice = error.message;
      render();
    }
  }
});

registerAppEvent('keydown', (event) => {
  if (event.target.matches('#chat-input') && event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    event.target.form.requestSubmit();
  }
});

render();