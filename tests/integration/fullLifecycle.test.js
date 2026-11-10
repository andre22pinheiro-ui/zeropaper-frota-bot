// tests/integration/fullLifecycle.test.js — Testes de Integração do Ciclo de Vida Completo
import test from 'node:test';
import assert from 'node:assert/strict';
import { kmService } from '../../src/services/kmService.js';
import { anomalyService } from '../../src/services/anomalyService.js';
import { hygieneService } from '../../src/services/hygieneService.js';
import { checklistService } from '../../src/services/checklistService.js';
import { stockService } from '../../src/services/stockService.js';
import { fleetService } from '../../src/services/fleetService.js';
import { dispatchMessage } from '../../src/ai/dispatcher.js';
import { ValidationError, AuthorizationError } from '../../src/utils/errors.js';

const mockAdmin = {
  name: 'André Rafael Macedo Pinheiro',
  numero: '1688',
  role: 'Chefia',
  telegramId: '950415577'
};

const mockMotorista = {
  name: 'António Silva',
  numero: '1720',
  role: 'Motorista',
  telegramId: '987654321'
};

test('Ciclo de Vida: Higienização e Lavagem de Viatura', async () => {
  const { payload, preview } = await hygieneService.prepareHygiene(
    mockAdmin,
    '01-AA-01',
    'completa',
    'Lavagem geral interior e desinfeção de bancos'
  );

  assert.equal(payload.matricula, '01-AA-01');
  assert.equal(payload.tipo, 'completa');
  assert.ok(preview.includes('01-AA-01'));
  assert.ok(preview.includes('completa'));
});

test('Ciclo de Vida: Checklist e Vistoria Diária', async () => {
  const itens = {
    certificado: 'OK',
    inspeccao: 'OK',
    seguro: 'OK'
  };

  const { payload, preview } = await checklistService.prepareChecklist(
    mockAdmin,
    '39-HZ-66',
    'Vistoria de saída sem anomalias detetadas',
    itens
  );

  assert.equal(payload.matricula, '39-HZ-66');
  assert.ok(payload.observacoes.includes('Vistoria de saída'));
  assert.ok(preview.includes('Vistoria'));
  assert.ok(preview.includes('39-HZ-66'));
});

test('Ciclo de Vida: Regras Estritas de Movimentação de Stock', async () => {
  // 1. Proposta válida de consumo
  const { payload, preview } = await stockService.prepareStockMovement(
    mockAdmin,
    'Filtros de Óleo',
    1,
    'consumir'
  );
  assert.equal(payload.quantidadeMovimento, 1);
  assert.equal(payload.operacao, 'consumir');
  assert.ok(preview.includes('Saída de Stock'));

  // 2. Bloqueio de Motorista a tentar gerir stock
  await assert.rejects(
    () => stockService.prepareStockMovement(
      mockMotorista,
      'Filtros de Óleo',
      1,
      'consumir'
    ),
    AuthorizationError
  );
});

test('Ciclo de Vida: Despachante Universal com Instrução em Linguagem Natural', async () => {
  const ctx = {
    from: { id: 950415577, first_name: 'André' },
    sendChatAction: async () => {}
  };

  // Pedido de consulta da frota em linguagem natural
  const res = await dispatchMessage('Como está a frota hoje?', ctx);
  assert.ok(res);
  assert.ok(res.text.includes('ZeroPaperFrota') || res.text.includes('Estado Geral'));
});
