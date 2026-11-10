// tests/unit/pendingActions.test.js — Testes Unitários da Máquina de Estados de Ações Pendentes
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPendingAction,
  getPendingAction,
  consumePendingAction,
  cancelPendingAction
} from '../../src/workflows/pendingActions.js';

test('PendingActions: Ciclo de vida e isolamento de utilizador', () => {
  const userId = '950415577';
  const otherUserId = '111222333';
  const payload = { matricula: '39-HZ-66', km: 155000 };

  // 1. Criação da ação pendente
  const action = createPendingAction(userId, 'register_km', payload);
  assert.ok(action.id);
  assert.equal(action.id.length, 12);
  assert.equal(action.userId, userId);
  assert.equal(action.operation, 'register_km');
  assert.equal(action.state, 'pending');
  assert.ok(action.expiresAt > Date.now());

  // 2. Consulta pelo próprio utilizador
  const retrieved = getPendingAction(action.id, userId);
  assert.ok(retrieved);
  assert.equal(retrieved.id, action.id);

  // 3. Bloqueio de acesso por outro utilizador (segurança / isolamento)
  const forbidden = getPendingAction(action.id, otherUserId);
  assert.equal(forbidden, null, 'Outro utilizador não deve ter acesso à ação pendente de terceiro');

  // 4. Consumo da ação pendente (confirmação em 1 passo único)
  const consumed = consumePendingAction(action.id, userId);
  assert.ok(consumed);
  assert.equal(consumed.state, 'completed');

  // 5. Anti-Replay: tentar consumir novamente deve retornar null
  const replayed = consumePendingAction(action.id, userId);
  assert.equal(replayed, null, 'Uma ação já consumida não pode ser reutilizada');
});

test('PendingActions: Cancelamento explícito de ação', () => {
  const userId = '950415577';
  const action = createPendingAction(userId, 'report_anomaly', { desc: 'Fuga de água' });

  // Cancelamento
  const cancelled = cancelPendingAction(action.id, userId);
  assert.ok(cancelled);
  assert.equal(cancelled.state, 'cancelled');

  // Já não existe
  assert.equal(getPendingAction(action.id, userId), null);
});
