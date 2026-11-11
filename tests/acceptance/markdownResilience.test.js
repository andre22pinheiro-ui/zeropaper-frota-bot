// tests/acceptance/markdownResilience.test.js — Testes de Resiliência de Mensagens Telegram
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendReply } from '../../src/bot/telegram.js';

test('Telegram Markdown: Envio normal bem-sucedido', async () => {
  let replyWithMarkdownCalled = false;
  let replyCalled = false;

  const mockCtx = {
    replyWithMarkdown: async (text, extra) => {
      replyWithMarkdownCalled = true;
      assert.ok(text.includes('*Olá*'));
    },
    reply: async (text, extra) => {
      replyCalled = true;
    }
  };

  await sendReply(mockCtx, '*Olá* mundo');
  assert.equal(replyWithMarkdownCalled, true);
  assert.equal(replyCalled, false, 'Fallback de texto simples não deve ser chamado em caso de sucesso');
});

test('Telegram Markdown: Fallback automático em caso de entidade inválida', async () => {
  let replyWithMarkdownCalled = false;
  let replyFallbackCalled = false;
  let sentPlainText = '';

  const mockCtx = {
    replyWithMarkdown: async (text, extra) => {
      replyWithMarkdownCalled = true;
      // Simula erro 400 Bad Request do Telegram por underscore não fechado
      throw new Error("400: Bad Request: can't parse entities: Can't find end of the entity starting at byte offset 12");
    },
    reply: async (text, extra) => {
      replyFallbackCalled = true;
      sentPlainText = text;
    }
  };

  const problematicText = 'Viatura 39-HZ-66 com estado: em_servico e [anomalia_grave';
  await sendReply(mockCtx, problematicText);

  assert.equal(replyWithMarkdownCalled, true);
  assert.equal(replyFallbackCalled, true, 'O fallback para texto simples DEVE ser acionado');
  assert.ok(!sentPlainText.includes('_'), 'Os underscores devem ser removidos no envio de fallback');
});

