import test from 'node:test';
import assert from 'node:assert/strict';
import { AIProviderNotConfiguredError, createChatService } from '../src/services/chatService.js';
import { createMemoryService } from '../src/services/memoryService.js';

test('chat service refuses to invent a response when no provider is configured', async () => {
  const service = createChatService();
  await assert.rejects(service.sendMessage({ messages: [{ role: 'user', content: 'Hello' }] }), AIProviderNotConfiguredError);
});

test('chat service delegates requests to a configured provider', async () => {
  const service = createChatService({ supportedLanguages: ['en'], generateReply: async ({ messages }) => ({ content: `Reply to ${messages.at(-1).content}` }) });
  assert.deepEqual(await service.sendMessage({ messages: [{ role: 'user', content: 'Hello' }], responseLanguage: 'en' }), { content: 'Reply to Hello' });
});

test('chat service forwards the original conversation and selected response language', async () => {
  let request;
  const messages = [{ role: 'user', content: 'Sannu, yaya kake?' }];
  const service = createChatService({ supportedLanguages: ['ha'], generateReply: async (value) => { request = value; return { content: 'Ina lafiya.' }; } });
  await service.sendMessage({ messages, responseLanguage: 'ha' });
  assert.equal(request.messages, messages);
  assert.equal(request.messages[0].content, 'Sannu, yaya kake?');
  assert.equal(request.responseLanguage, 'ha');
});

test('chat service does not assume provider language coverage', async () => {
  const unknown = createChatService({ generateReply: async () => ({ content: 'reply' }) });
  await assert.rejects(unknown.sendMessage({ messages: [], responseLanguage: 'en' }), { name: 'AIProviderLanguageCapabilitiesUnknownError' });
  const limited = createChatService({ supportedLanguages: ['en'], generateReply: async () => ({ content: 'reply' }) });
  await assert.rejects(limited.sendMessage({ messages: [], responseLanguage: 'ar' }), { name: 'AIProviderLanguageNotSupportedError' });
});

test('memory service validates, lists, and deletes user-provided memories', () => {
  const service = createMemoryService();
  const memory = service.add({ category: 'preference', content: '  Brief answers please  ' });
  assert.equal(memory.content, 'Brief answers please');
  assert.equal(service.list().length, 1);
  assert.equal(service.remove(memory.id), true);
  assert.equal(service.list().length, 0);
  assert.equal(service.remove(memory.id), false);
});

test('memory service rejects unsupported categories and oversized content', () => {
  const service = createMemoryService();
  assert.throws(() => service.add({ category: 'location', content: 'Somewhere' }), TypeError);
  assert.throws(() => service.add({ category: 'topic', content: 'x'.repeat(241) }), RangeError);
});