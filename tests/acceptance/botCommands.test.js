// tests/acceptance/botCommands.test.js — Testes de Aceitação de Comandos de Barra do Bot
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerCommands, buildFleetCockpitKeyboard } from '../../src/bot/commands.js';
import { handleCallbackQuery } from '../../src/bot/callbacks.js';

test('Comandos do Bot: Registo e Execução de Comandos com Mock Context', async () => {
  const handlers = new Map();
  const mockBot = {
    command: (cmds, handler) => {
      const list = Array.isArray(cmds) ? cmds : [cmds];
      for (const c of list) handlers.set(c, handler);
    }
  };

  registerCommands(mockBot);

  // Verifica que os comandos essenciais foram registados
  const requiredCommands = ['start', 'help', 'ajuda', 'frota', 'viaturas', 'km', 'avaria', 'stock'];
  for (const cmd of requiredCommands) {
    assert.ok(handlers.has(cmd), `Comando /${cmd} deve estar registado no bot`);
  }

  // 1. Teste de /start com Administrador Autorizado
  let startReply = '';
  const adminCtx = {
    from: { id: 950415577, first_name: 'André' },
    replyWithMarkdown: async (text) => { startReply = text; },
    reply: async (text) => { startReply = text; }
  };
  await handlers.get('start')(adminCtx);
  assert.ok(startReply.includes('André'), 'Deve saudar o administrador pelo nome');
  assert.ok(startReply.includes('Chefia'), 'Deve indicar o perfil de Chefia');
  assert.ok(startReply.includes('/frota'), 'Deve listar os comandos disponíveis');

  // 2. Teste de /start com Utilizador Não Autorizado
  let unauthorizedReply = '';
  const intruderCtx = {
    from: { id: 999999999, first_name: 'Desconhecido' },
    replyWithMarkdown: async (text) => { unauthorizedReply = text; },
    reply: async (text) => { unauthorizedReply = text; }
  };
  await handlers.get('start')(intruderCtx);
  assert.ok(unauthorizedReply.includes('não se encontra autorizado'));

  // 3. Teste de /help e /ajuda
  let helpReply = '';
  const helpCtx = {
    replyWithMarkdown: async (text) => { helpReply = text; }
  };
  await handlers.get('ajuda')(helpCtx);
  assert.ok(helpReply.includes('Guia Operacional ZeroPaperFrota'));
  assert.ok(helpReply.includes('Confirmar'));

  // 4. Teste de /frota
  let frotaReply = '';
  let typingSent = false;
  const frotaCtx = {
    sendChatAction: async (action) => { if (action === 'typing') typingSent = true; },
    replyWithMarkdown: async (text) => { frotaReply = text; }
  };
  await handlers.get('frota')(frotaCtx);
  assert.equal(typingSent, true, 'Deve enviar ação de typing');
  assert.ok(frotaReply.includes('ZeroPaperFrota'), 'Deve conter o cabeçalho da frota');
  assert.ok(frotaReply.includes('39-HZ-66') || frotaReply.includes('01-AA-01'), 'Deve listar viaturas reais');

  // 5. Teste de /km sem argumentos (exibição de instruções)
  let kmGuideReply = '';
  const kmEmptyCtx = {
    message: { text: '/km' },
    replyWithMarkdown: async (text) => { kmGuideReply = text; }
  };
  await handlers.get('km')(kmEmptyCtx);
  assert.ok(kmGuideReply.includes('Registo de Quilometragem'));
  assert.ok(kmGuideReply.includes('Usa o formato:'));

  // 6. Teste de /avaria sem argumentos (exibição de instruções)
  let avariaGuideReply = '';
  const avariaEmptyCtx = {
    message: { text: '/avaria' },
    replyWithMarkdown: async (text) => { avariaGuideReply = text; }
  };
  await handlers.get('avaria')(avariaEmptyCtx);
  assert.ok(avariaGuideReply.includes('Reporte de Anomalia'));

  // 7. Teste de /stock
  let stockReply = '';
  const stockCtx = {
    from: { id: 950415577, first_name: 'André' },
    replyWithMarkdown: async (text) => { stockReply = text; }
  };
  await handlers.get('stock')(stockCtx);
  assert.ok(stockReply.includes('Inventário de Stock'));

  // 8. Teste dos novos atalhos /apk, /rotabus, /appfrota e cockpit
  for (const cmd of ['apk', 'apks', 'rotabus', 'appfrota']) {
    assert.ok(handlers.has(cmd), `Comando /${cmd} deve estar registado`);
  }
  const cockpit = buildFleetCockpitKeyboard();
  assert.ok(JSON.stringify(cockpit).includes('frota_porto_lisboa'), 'Cockpit deve expor atalho frota_porto_lisboa');

  // 9. Teste dos callbacks rápidos legados (@zeropaperfrotaBot) + isolamento autorização
  const prevOrs = process.env.ORS_API_KEY;
  const prevOpenRoute = process.env.OPENROUTESERVICE_API_KEY;
  delete process.env.ORS_API_KEY;
  delete process.env.OPENROUTESERVICE_API_KEY;
  try {
    let cbReply = '';
    const okCbCtx = {
      from: { id: 950415577, first_name: 'André' },
      callbackQuery: { data: 'btn_tacho_45' },
      answerCbQuery: async () => {},
      replyWithMarkdown: async (text) => { cbReply = text; }
    };
    await handleCallbackQuery(okCbCtx);
    assert.ok(cbReply.includes('CE 561/2006') && cbReply.includes('4.5'), 'Callback btn_tacho_45 deve gerar relatório CE 561/2006');

    let routeReply = '';
    await handleCallbackQuery({
      ...okCbCtx,
      callbackQuery: { data: 'frota_porto_lisboa' },
      replyWithMarkdown: async (text) => { routeReply = text; }
    });
    assert.ok(routeReply.includes('Porto') && routeReply.includes('Lisboa'), 'Callback frota_porto_lisboa deve calcular rota Porto -> Lisboa');

    let blockedAlert = '';
    let blockedReplyCount = 0;
    await handleCallbackQuery({
      from: { id: 999999999, first_name: 'Intruso' },
      callbackQuery: { data: 'act_frota_status' },
      answerCbQuery: async (txt) => { blockedAlert = txt; },
      replyWithMarkdown: async () => { blockedReplyCount++; }
    });
    assert.ok(blockedAlert.includes('não autorizado') && blockedReplyCount === 0, 'Intruso deve ser bloqueado nos callbacks rápidos');
  } finally {
    if (prevOrs !== undefined) process.env.ORS_API_KEY = prevOrs;
    if (prevOpenRoute !== undefined) process.env.OPENROUTESERVICE_API_KEY = prevOpenRoute;
  }
});

