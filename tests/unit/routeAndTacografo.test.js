// tests/unit/routeAndTacografo.test.js — Testes de Rota Pesados (ORS) e Auditoria Tacógrafo CE 561/2006
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeService } from '../../src/services/routeService.js';
import { registerCommands } from '../../src/bot/commands.js';
import { dispatchMessage } from '../../src/ai/dispatcher.js';

test('Tacógrafo CE 561/2006: cálculos exatos (4.5h, 8.5h, 9.5h, 11h e inválido)', () => {
  const b45 = routeService.calcularTacografo(4.5);
  assert.equal(b45.pausasObrigatorias, 1);
  assert.equal(b45.tempoPausaMin, 45);
  assert.ok(b45.legal.includes('Dentro do limite'));

  const b85 = routeService.calcularTacografo('8,5');
  assert.equal(b85.horasConducao, 8.5);
  assert.equal(b85.pausasObrigatorias, 1);
  assert.equal(b85.tempoTotalViagem, '9h 15min');

  const b95 = routeService.calcularTacografo(9.5);
  assert.ok(b95.legal.includes('Extensão diária de 10h'));

  const b11 = routeService.calcularTacografo(11);
  assert.ok(b11.legal.includes('INFRAÇÃO GRAVE'));

  assert.equal(routeService.calcularTacografo('abc'), null);
  assert.equal(routeService.calcularTacografo(-2), null);
});

test('RotaBus URL & handleRota fallback determinístico sem inventar km falsos', async () => {
  const prevOrs = process.env.ORS_API_KEY;
  const prevOpenRoute = process.env.OPENROUTESERVICE_API_KEY;
  delete process.env.ORS_API_KEY;
  delete process.env.OPENROUTESERVICE_API_KEY;

  try {
    const out = await routeService.handleRota('Amarante para Braga');
    assert.ok(out.includes('Amarante'));
    assert.ok(out.includes('Braga'));
    assert.ok(out.includes('smooth-bus-routes.vercel.app'));
    assert.ok(out.includes('driving-hgv'));
  } finally {
    if (prevOrs !== undefined) process.env.ORS_API_KEY = prevOrs;
    if (prevOpenRoute !== undefined) process.env.OPENROUTESERVICE_API_KEY = prevOpenRoute;
  }
});

test('Comandos /rota e /tacografo registados no ZeroPaperFrota Bot', async () => {
  const handlers = new Map();
  const mockBot = {
    command: (cmds, handler) => {
      const list = Array.isArray(cmds) ? cmds : [cmds];
      for (const c of list) handlers.set(c, handler);
    }
  };

  registerCommands(mockBot);
  assert.ok(handlers.has('rota'));
  assert.ok(handlers.has('tacografo'));

  let reply = '';
  await handlers.get('tacografo')({
    from: { id: 950415577, first_name: 'André' },
    message: { text: '/tacografo 8.5' },
    replyWithMarkdown: async (t) => { reply = t; },
    reply: async (t) => { reply = t; }
  });
  assert.ok(reply.includes('8.5h'));
  assert.ok(reply.includes('CE 561/2006'));
});

test('Dispatcher interpreta pedidos em linguagem natural de Tacógrafo', async () => {
  const res = await dispatchMessage('Auditoria de tacografo para 9.5 horas de conducao', {
    from: { id: 950415577, first_name: 'André' }
  });
  assert.ok(res.text.includes('9.5h'));
  assert.ok(res.text.includes('Extensão diária de 10h'));
});

