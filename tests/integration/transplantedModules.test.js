// tests/integration/transplantedModules.test.js — Testes de Integração dos Módulos Transplantados
import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleService, parseScheduleInstruction, orderScheduleRoutes } from '../../src/services/scheduleService.js';
import { vacationService } from '../../src/services/vacationService.js';
import { fleetAlertsService } from '../../src/services/fleetAlertsService.js';
import { registerCommands, buildFleetCockpitKeyboard } from '../../src/bot/commands.js';
import { handleCallbackQuery } from '../../src/bot/callbacks.js';

const mockChefia = {
  name: 'André Rafael Macedo Pinheiro',
  numero: '1688',
  role: 'Chefia',
  telegramId: '950415577'
};

const mockMotorista = {
  name: 'Carlos Oliveira',
  numero: '02',
  role: 'Motorista',
  telegramId: '123456789'
};

test('ScheduleService: Parsing de Linguagem Natural e Ordenação de Circuitos', () => {
  const ref = new Date('2026-11-16T10:00:00'); // Segunda-feira
  assert.equal(parseScheduleInstruction('hoje', ref), '2026-11-16');
  assert.equal(parseScheduleInstruction('amanhã', ref), '2026-11-17');
  assert.equal(parseScheduleInstruction('escala de terça', ref), '2026-11-17');
  assert.equal(parseScheduleInstruction('escala de sexta-feira', ref), '2026-11-20');
  assert.equal(parseScheduleInstruction('2026-11-30', ref), '2026-11-30');

  const unorderedRoutes = [
    { data: '2026-11-16', ordem_servico: 2, motorista: 'Condutor B' },
    { data: '2026-11-16', ordem_servico: 1, motorista: 'Condutor A' }
  ];
  const ordered = orderScheduleRoutes(unorderedRoutes);
  assert.equal(ordered[0].motorista, 'Condutor A');
  assert.equal(ordered[0].ordem_servico, 1);
  assert.equal(ordered[1].motorista, 'Condutor B');
  assert.equal(ordered[1].ordem_servico, 2);
});

test('ScheduleService: Consulta Real de Escala na Base Supabase', async () => {
  const reportHoje = await scheduleService.getDailyScheduleReport('hoje');
  assert.ok(reportHoje.includes('Escala de Serviço'));
  assert.ok(reportHoje.includes('Sem serviços escalados') || reportHoje.includes('Total de circuitos'));

  const reportData = await scheduleService.getDailyScheduleReport('2026-11-16');
  assert.ok(reportData.includes('2026-11-16'));
});

test('VacationService: Consulta de Férias e Ausências por Perfil', async () => {
  // 1. Chefia recebe pedidos pendentes por defeito
  const reportChefia = await vacationService.getVacationReport(mockChefia, '');
  assert.ok(reportChefia.includes('Férias'));

  // 2. Consulta filtrada por "pendentes"
  const reportPendentes = await vacationService.getVacationReport(mockChefia, 'pendentes');
  assert.ok(reportPendentes.includes('Pendentes') || reportPendentes.includes('Férias'));

  // 3. Consulta de histórico de colaborador específico
  const reportNum = await vacationService.getVacationReport(mockChefia, '01');
  assert.ok(reportNum.includes('Histórico de Férias'));
});

test('FleetAlertsService: Relatório de Alertas de Viaturas e Documentos Pessoal', async () => {
  const report = await fleetAlertsService.getOperationalAlertsReport();
  assert.ok(report.includes('ZeroPaperFrota — Painel de Alertas Operacionais'));
  assert.ok(typeof report === 'string');
});

test('Teclado e Comandos do Bot: Integração dos Novos Comandos (/escala, /ferias, /alertas)', async () => {
  const keyboard = buildFleetCockpitKeyboard();
  const flatButtons = keyboard.reply_markup.inline_keyboard.flat();
  const buttonCallbacks = flatButtons.map(b => b.callback_data).filter(Boolean);

  assert.ok(buttonCallbacks.includes('act_frota_escala'), 'Teclado deve incluir botão de Escala');
  assert.ok(buttonCallbacks.includes('act_frota_ferias'), 'Teclado deve incluir botão de Férias');
  assert.ok(buttonCallbacks.includes('act_frota_alertas'), 'Teclado deve incluir botão de Alertas');

  // Registo de comandos
  const handlers = new Map();
  const mockBot = {
    command: (cmds, handler) => {
      const list = Array.isArray(cmds) ? cmds : [cmds];
      for (const c of list) handlers.set(c, handler);
    }
  };
  registerCommands(mockBot);

  assert.ok(handlers.has('escala'), 'Handler /escala deve estar registado');
  assert.ok(handlers.has('ferias'), 'Handler /ferias deve estar registado');
  assert.ok(handlers.has('ausencias'), 'Handler /ausencias deve estar registado');
  assert.ok(handlers.has('alertas'), 'Handler /alertas deve estar registado');
  assert.ok(handlers.has('inspecoes'), 'Handler /inspecoes deve estar registado');

  // Execução simulada com utilizador autorizado
  let repliedText = '';
  const mockCtx = {
    from: { id: 950415577, first_name: 'André' },
    message: { text: '/escala hoje' },
    sendChatAction: async () => {},
    replyWithMarkdown: async (text) => { repliedText = text; }
  };

  await handlers.get('escala')(mockCtx);
  assert.ok(repliedText.includes('Escala de Serviço'));

  await handlers.get('alertas')(mockCtx);
  assert.ok(repliedText.includes('Alertas Operacionais'));
});

test('Callbacks Interativos: act_frota_escala, act_frota_ferias, act_frota_alertas', async () => {
  let replied = '';
  const mockCbCtx = {
    from: { id: 950415577, first_name: 'André' },
    callbackQuery: { data: 'act_frota_escala' },
    answerCbQuery: async () => {},
    replyWithMarkdown: async (text) => { replied = text; }
  };

  await handleCallbackQuery(mockCbCtx);
  assert.ok(replied.includes('Escala de Serviço'));

  mockCbCtx.callbackQuery.data = 'act_frota_alertas';
  await handleCallbackQuery(mockCbCtx);
  assert.ok(replied.includes('Alertas Operacionais'));
});
