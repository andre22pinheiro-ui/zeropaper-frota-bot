// tests/unit/permissions.test.js — Testes Unitários de Matriz de Permissões
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, enforcePermission } from '../../src/security/permissions.js';
import { AuthorizationError } from '../../src/utils/errors.js';

test('Matriz de Permissões por Função Operacional', () => {
  // Motorista
  assert.equal(hasPermission('Motorista', 'register_km'), true);
  assert.equal(hasPermission('Motorista', 'report_anomaly'), true);
  assert.equal(hasPermission('Motorista', 'manage_stock'), false);
  assert.equal(hasPermission('Motorista', 'manage_users'), false);

  // Oficina / Mecânico
  assert.equal(hasPermission('Oficina', 'submit_maintenance'), true);
  assert.equal(hasPermission('Oficina', 'manage_stock'), true);
  assert.equal(hasPermission('Oficina', 'register_km'), false);

  // Chefia (Acesso Total)
  assert.equal(hasPermission('Chefia', 'register_km'), true);
  assert.equal(hasPermission('Chefia', 'manage_stock'), true);
  assert.equal(hasPermission('Chefia', 'manage_users'), true);
});

test('EnforcePermission com Lançamento de Exceção', () => {
  const driver = { name: 'João', role: 'Motorista' };
  assert.doesNotThrow(() => enforcePermission(driver, 'register_km'));
  assert.throws(() => enforcePermission(driver, 'manage_stock'), AuthorizationError);

  // Utilizador nulo
  assert.throws(() => enforcePermission(null, 'view_fleet'), AuthorizationError);
});
