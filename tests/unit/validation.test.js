// tests/unit/validation.test.js — Testes Unitários de Validações de Domínio
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndFormatPlate, validateOdometer, analyzeSafetyRisk, validateStockQuantity } from '../../src/security/validation.js';
import { ValidationError } from '../../src/utils/errors.js';

test('Validação de Matrícula Portuguesa', () => {
  assert.equal(validateAndFormatPlate('39-hz-66'), '39-HZ-66');
  assert.equal(validateAndFormatPlate('39 HZ 66'), '39-HZ-66');
  assert.equal(validateAndFormatPlate('39hz66'), '39-HZ-66');
  assert.equal(validateAndFormatPlate('01-AA-01'), '01-AA-01');

  assert.throws(() => validateAndFormatPlate('INVALIDO'), ValidationError);
  assert.throws(() => validateAndFormatPlate('123'), ValidationError);
});

test('Validação de Odómetro e Não-Decrescimento', () => {
  // Caso de sucesso normal
  const ok = validateOdometer(155000, 154000);
  assert.equal(ok.valid, true);
  assert.equal(ok.diferenca, 1000);
  assert.equal(ok.isAnomalous, false);

  // Caso anómalo (> 1000 km)
  const anomalous = validateOdometer(156500, 154000);
  assert.equal(anomalous.isAnomalous, true);

  // Odómetro inferior (Bloqueio Obrigatório)
  assert.throws(() => validateOdometer(153000, 154000), (err) => {
    return err instanceof ValidationError && err.message.includes('INCONSISTÊNCIA DE ODÓMETRO');
  });

  // Valor negativo ou inválido
  assert.throws(() => validateOdometer(-100, 0), ValidationError);
  assert.throws(() => validateOdometer('abc', 0), ValidationError);
});

test('Análise de Risco de Segurança em Anomalias', () => {
  const safe = analyzeSafetyRisk('Limpeza de retrovisor direito.');
  assert.equal(safe.isSafetyCritical, false);

  const criticalBrakes = analyzeSafetyRisk('Pastilhas a chiar e pedal do travão a ir ao fundo.');
  assert.equal(criticalBrakes.isSafetyCritical, true);
  assert.ok(criticalBrakes.terms.includes('travão') || criticalBrakes.terms.includes('pastilhas'));

  const criticalSteering = analyzeSafetyRisk('Volante com folga enorme na direção.');
  assert.equal(criticalSteering.isSafetyCritical, true);
});

test('Validação de Movimento de Stock', () => {
  assert.equal(validateStockQuantity(5, 'adicionar', 10), 5);
  assert.equal(validateStockQuantity(4, 'consumir', 10), 4);

  // Proibição de stock negativo
  assert.throws(() => validateStockQuantity(15, 'consumir', 10), (err) => {
    return err instanceof ValidationError && err.message.includes('STOCK INSUFICIENTE');
  });

  // Quantidade zero ou negativa
  assert.throws(() => validateStockQuantity(0, 'adicionar', 10), ValidationError);
  assert.throws(() => validateStockQuantity(-2, 'adicionar', 10), ValidationError);
});
