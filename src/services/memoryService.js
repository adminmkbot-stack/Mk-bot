const categories = new Set(['preference', 'topic', 'pattern', 'language']);

export function createMemoryService() {
  const memories = [];

  return {
    list() {
      return memories.map((memory) => ({ ...memory }));
    },
    add({ category, content }) {
      const cleanContent = String(content || '').trim();
      if (!categories.has(category)) throw new TypeError('Choose a valid memory category.');
      if (!cleanContent) throw new TypeError('Memory content cannot be empty.');
      if (cleanContent.length > 240) throw new RangeError('Memory content must be 240 characters or fewer.');
      const memory = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, category, content: cleanContent };
      memories.unshift(memory);
      return { ...memory };
    },
    remove(id) {
      const index = memories.findIndex((memory) => memory.id === id);
      if (index === -1) return false;
      memories.splice(index, 1);
      return true;
    },
    clear() {
      memories.length = 0;
    },
  };
}