// tests/unit/idempotency.test.js — Testes Unitários de Idempotência e Anti-Duplicação
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateKey,
  isAlreadyProcessed,
  recordExecution,
  getPreviousResult
} from '../../src/workflows/idempotency.js';

test('Idempotência: Geração determinística de chaves SHA-256', () => {
  const payloadA = { matricula: '39-HZ-66', km: 155000 };
  const payloadB = { matricula: '39-HZ-66', km: 155000 };
  const payloadC = { matricula: '39-HZ-66', km: 155001 };

  const key1 = generateKey('950415577', 'km_register', payloadA);
  const key2 = generateKey('950415577', 'km_register', payloadB);
  const key3 = generateKey('950415577', 'km_register', payloadC);
  const keyOtherUser = generateKey('123456789', 'km_register', payloadA);

  assert.equal(typeof key1, 'string');
  assert.equal(key1.length, 64); // SHA-256 hex string
  assert.equal(key1, key2, 'Mesmo utilizador e payload idêntico devem gerar a mesma chave');
  assert.notEqual(key1, key3, 'Payload diferente deve gerar chave diferente');
  assert.notEqual(key1, keyOtherUser, 'Utilizadores diferentes devem gerar chaves distintas');
});

test('Idempotência: Registo e deteção de pedidos repetidos', () => {
  const uniqueKey = 'test_key_' + Date.now() + '_' + Math.random();

  // Inicialmente não foi processada
  assert.equal(isAlreadyProcessed(uniqueKey), false);
  assert.equal(getPreviousResult(uniqueKey), null);

  // Regista execução com resultado
  const mockResult = { status: 'sucesso', id: 42 };
  recordExecution(uniqueKey, mockResult);

  // Agora deve ser detetada como já processada
  assert.equal(isAlreadyProcessed(uniqueKey), true);
  assert.deepEqual(getPreviousResult(uniqueKey), mockResult);
});

