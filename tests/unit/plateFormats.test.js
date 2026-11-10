// tests/unit/plateFormats.test.js — Testes Exaustivos de Matrículas Portuguesas
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndFormatPlate } from '../../src/security/validation.js';
import { ValidationError } from '../../src/utils/errors.js';

test('Matrículas Portuguesas: Suporte a Todas as 4 Séries Oficiais', () => {
  // Série 1 (1937–1992): AA-00-00
  assert.equal(validateAndFormatPlate('AB-12-34'), 'AB-12-34');
  assert.equal(validateAndFormatPlate('ab1234'), 'AB-12-34');
  assert.equal(validateAndFormatPlate('ab-12-34'), 'AB-12-34');

  // Série 2 (1992–2005): 00-00-AA
  assert.equal(validateAndFormatPlate('12-34-AB'), '12-34-AB');
  assert.equal(validateAndFormatPlate('1234ab'), '12-34-AB');
  assert.equal(validateAndFormatPlate('12 34 ab'), '12-34-AB');

  // Série 3 (2005–2020): 00-AA-00
  assert.equal(validateAndFormatPlate('39-HZ-66'), '39-HZ-66');
  assert.equal(validateAndFormatPlate('55-tn-89'), '55-TN-89');
  assert.equal(validateAndFormatPlate('12 XE 34'), '12-XE-34');
  assert.equal(validateAndFormatPlate('01AA01'), '01-AA-01');

  // Série 4 (2020–presente): AA-00-AA
  assert.equal(validateAndFormatPlate('AA-01-AA'), 'AA-01-AA');
  assert.equal(validateAndFormatPlate('az99zz'), 'AZ-99-ZZ');
  assert.equal(validateAndFormatPlate('BA-10-CD'), 'BA-10-CD');
});

test('Matrículas Portuguesas: Rejeição de Formatos Inválidos', () => {
  const invalidPlates = [
    '',
    '   ',
    'ABC',
    '12345',
    '000-AAA-000',
    'ZZ-ZZ-ZZ', // 3 pares de letras (inválido)
    '99-99-99', // 3 pares de números (inválido)
    'ESP-1234', // Matrícula estrangeira sem suporte
    '39-HZ-666', // Excesso de dígitos
    'A1-B2-C3', // Caracteres alternados inválidos
    null,
    undefined
  ];

  for (const plate of invalidPlates) {
    assert.throws(
      () => validateAndFormatPlate(plate),
      ValidationError,
      `Deveria rejeitar matrícula inválida: "${plate}"`
    );
  }
});
