function cloneConversation(conversation) {
  return {
    ...conversation,
    createdAt: new Date(conversation.createdAt).toISOString(),
    messages: conversation.messages.map((message) => ({ ...message, createdAt: new Date(message.createdAt).toISOString() })),
  };
}

function isConversation(value) {
  return value && typeof value.id === 'string' && Array.isArray(value.messages)
    && value.messages.every((message) => message && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string');
}

function defaultId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createConversationRepository({
  storage = globalThis.localStorage,
  getAuthenticatedUser = () => null,
  cloudAdapter = null,
  idFactory = defaultId,
} = {}) {
  const fallback = new Map();

  async function currentUid() {
    const user = await getAuthenticatedUser();
    return typeof user?.uid === 'string' && user.uid ? user.uid : null;
  }

  function storageKey(uid) {
    return `mkbot-conversations:${uid ? encodeURIComponent(uid) : 'guest'}`;
  }

  function readLocal(uid) {
    const key = storageKey(uid);
    try {
      const stored = storage?.getItem(key);
      if (stored !== null && stored !== undefined) {
        const conversations = JSON.parse(stored);
        return Array.isArray(conversations) ? conversations.filter(isConversation) : [];
      }
    } catch {
      return (fallback.get(key) ?? []).map(cloneConversation);
    }
    return (fallback.get(key) ?? []).map(cloneConversation);
  }

  function writeLocal(uid, conversations) {
    const key = storageKey(uid);
    const snapshot = conversations.map(cloneConversation);
    fallback.set(key, snapshot);
    try {
      storage?.setItem(key, JSON.stringify(snapshot));
    } catch {
      // Keep the conversation for this page lifetime if browser storage is unavailable.
    }
  }

  async function list() {
    const uid = await currentUid();
    if (uid && cloudAdapter) {
      const remote = await cloudAdapter.list({ uid });
      const conversations = Array.isArray(remote) ? remote.filter(isConversation).map(cloneConversation) : [];
      writeLocal(uid, conversations);
      return conversations.map(cloneConversation);
    }
    return readLocal(uid).map(cloneConversation);
  }

  return {
    async list() {
      return list();
    },
    async get(id) {
      const conversation = (await list()).find((item) => item.id === String(id));
      return conversation ? cloneConversation(conversation) : null;
    },
    async create() {
      const conversations = await list();
      const usedIds = new Set(conversations.map((conversation) => conversation.id));
      let id = String(idFactory());
      let collision = 0;
      while (usedIds.has(id)) id = `${String(idFactory())}-${++collision}`;
      const conversation = { id, title: '', createdAt: new Date().toISOString(), messages: [] };
      await this.save(conversation);
      return cloneConversation(conversation);
    },
    async save(conversation) {
      if (!isConversation(conversation)) throw new TypeError('A conversation must have an ID and valid messages.');
      const uid = await currentUid();
      const conversations = uid && cloudAdapter ? await list() : readLocal(uid);
      const index = conversations.findIndex((item) => item.id === conversation.id);
      const snapshot = cloneConversation(conversation);
      if (index === -1) conversations.unshift(snapshot);
      else conversations[index] = snapshot;

      if (uid && cloudAdapter) {
        if (index === -1) await cloudAdapter.create({ uid, conversation: cloneConversation(snapshot) });
        else await cloudAdapter.update({ uid, conversation: cloneConversation(snapshot) });
      }
      writeLocal(uid, conversations);
      return cloneConversation(snapshot);
    },
  };
}