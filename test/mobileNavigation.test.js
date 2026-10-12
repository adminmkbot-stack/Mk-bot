import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createConversationRepository } from '../src/services/conversationRepository.js';
import { activateDrawerFromLogo, createNavigationDrawer } from '../src/services/navigationDrawer.js';
import { createThemeService } from '../src/services/themeService.js';
import { listNavigationViews, resolveNavigationView } from '../src/services/navigationRoutes.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test('MK BOT logo opens the modal drawer and Escape closes it with focus restored', () => {
  let open = false;
  let showCount = 0;
  let closeCount = 0;
  let initialFocusCount = 0;
  let triggerFocusCount = 0;
  const dialog = {
    get open() { return open; },
    showModal() { open = true; showCount += 1; },
    close() { open = false; closeCount += 1; },
  };
  const trigger = { isConnected: true, matches: (selector) => selector === '[data-open-drawer]', focus() { triggerFocusCount += 1; } };
  const drawer = createNavigationDrawer({ getDialog: () => dialog, getInitialFocus: () => ({ focus() { initialFocusCount += 1; } }) });
  assert.equal(activateDrawerFromLogo(trigger, drawer), true);
  assert.equal(open, true);
  assert.equal(showCount, 1);
  assert.equal(initialFocusCount, 1);
  let prevented = false;
  assert.equal(drawer.handleKeydown({ key: 'Escape', preventDefault() { prevented = true; } }), true);
  assert.equal(prevented, true);
  assert.equal(open, false);
  assert.equal(closeCount, 1);
  assert.equal(triggerFocusCount, 1);
});

test('drawer closes through its explicit close action', () => {
  let open = false;
  const drawer = createNavigationDrawer({
    getDialog: () => ({ get open() { return open; }, showModal() { open = true; }, close() { open = false; } }),
  });
  drawer.open();
  assert.equal(open, true);
  assert.equal(drawer.close(), true);
  assert.equal(open, false);
});

test('new guest conversations have unique IDs and reopening restores isolated messages', async () => {
  const storage = createStorage();
  const repository = createConversationRepository({ storage, idFactory: () => 'conversation' });
  const first = await repository.create();
  first.title = 'First thread';
  first.messages.push({ role: 'user', content: 'Original message', createdAt: new Date().toISOString() });
  await repository.save(first);
  const second = await repository.create();
  second.title = 'Second thread';
  second.messages.push({ role: 'user', content: 'Different message', createdAt: new Date().toISOString() });
  await repository.save(second);

  assert.notEqual(first.id, second.id);
  const restoredRepository = createConversationRepository({ storage });
  const restoredFirst = await restoredRepository.get(first.id);
  const restoredSecond = await restoredRepository.get(second.id);
  assert.equal(restoredFirst.messages[0].content, 'Original message');
  assert.equal(restoredSecond.messages[0].content, 'Different message');
  assert.equal((await restoredRepository.list()).length, 2);
});

test('authenticated conversations are routed through a UID-scoped cloud adapter', async () => {
  const calls = [];
  const cloudConversations = new Map();
  const cloudAdapter = {
    async list({ uid }) { calls.push(['list', uid]); return cloudConversations.get(uid) ?? []; },
    async create({ uid, conversation }) {
      calls.push(['create', uid, conversation.id]);
      cloudConversations.set(uid, [...(cloudConversations.get(uid) ?? []), conversation]);
    },
    async update({ uid, conversation }) {
      calls.push(['update', uid, conversation.id]);
      cloudConversations.set(uid, (cloudConversations.get(uid) ?? []).map((item) => item.id === conversation.id ? conversation : item));
    },
  };
  const repository = createConversationRepository({
    storage: createStorage(),
    getAuthenticatedUser: async () => ({ uid: 'verified-user-42' }),
    cloudAdapter,
    idFactory: () => 'cloud-thread',
  });
  const conversation = await repository.create();
  conversation.messages.push({ role: 'user', content: 'Cloud message', createdAt: new Date().toISOString() });
  await repository.save(conversation);
  assert.ok(calls.some(([operation, uid]) => operation === 'list' && uid === 'verified-user-42'));
  assert.ok(calls.some(([operation, uid]) => operation === 'create' && uid === 'verified-user-42'));
  assert.ok(calls.some(([operation, uid]) => operation === 'update' && uid === 'verified-user-42'));
});

test('theme preference persists and rejects invalid options', () => {
  const storage = createStorage();
  const theme = createThemeService(storage);
  assert.equal(theme.theme, 'system');
  assert.equal(theme.setTheme('dark'), true);
  assert.equal(theme.setTheme('neon'), false);
  assert.equal(createThemeService(storage).theme, 'dark');
});

test('app shell keeps language selectors out of the main header and exposes both settings in the drawer', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const shell = source.slice(source.indexOf('function renderShell'), source.indexOf('function renderDashboard'));
  const drawer = source.slice(source.indexOf('function renderDrawer()'), source.indexOf('function renderShell'));
  const chatPage = source.slice(source.indexOf('function renderChats()'), source.indexOf('function renderMemoryList'));
  const topbar = shell.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1] ?? '';

  assert.match(topbar, /data-open-drawer/);
  assert.doesNotMatch(topbar, /languageControl\(/);
  assert.match(drawer, /data-new-chat/);
  assert.match(drawer, /languageControl\('interface'\)/);
  assert.match(drawer, /languageControl\('response'\)/);
  assert.match(chatPage, /data-new-chat/);
  assert.match(source, /data-open-drawer/);
});

test('language picker renders native and English names and searches normalized native names', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const picker = source.slice(source.indexOf('function languageControl'), source.indexOf('function brand'));
  assert.match(picker, /<strong>\$\{escapeHtml\(language\.nativeName\)\}<\/strong>/);
  assert.match(picker, /language\.name\} \$\{language\.properName\} \$\{language\.nativeName\}/);
  assert.doesNotMatch(picker, /language\.locale\.toUpperCase\(\)/);
});

test('all supported view buttons resolve to existing navigation destinations', () => {
  const expectedViews = ['dashboard', 'chats', 'learn', 'research', 'profile', 'login', 'signup', 'splash'];
  assert.deepEqual(listNavigationViews().sort(), [...expectedViews].sort());
  for (const view of expectedViews) assert.equal(resolveNavigationView({ dataset: { view } }), view);
  assert.equal(resolveNavigationView({ dataset: { view: 'missing' } }), null);
  assert.equal(resolveNavigationView(null), null);
});

test('Home maps to the existing dashboard renderer', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const navigation = source.slice(source.indexOf('const navItems'), source.indexOf('function renderNav'));
  const pageMap = source.slice(source.indexOf('const pages ='), source.indexOf('app.innerHTML = renderShell', source.indexOf('const pages =')));
  assert.match(navigation, /view: 'dashboard', key: 'home'/);
  assert.match(pageMap, /dashboard: renderDashboard/);
  assert.equal(resolveNavigationView({ dataset: { view: 'dashboard' } }), 'dashboard');
});

test('settings action is present in the drawer and focuses a language setting', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const drawer = source.slice(source.indexOf('function renderDrawer()'), source.indexOf('function renderShell'));
  assert.match(drawer, /data-open-settings/);
  assert.match(drawer, /id="drawer-settings"/);
  assert.match(source, /settings\.querySelector\('\.language-picker > summary'\)\?\.focus\(\)/);
});