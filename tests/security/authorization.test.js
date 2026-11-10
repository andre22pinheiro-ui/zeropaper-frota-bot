// tests/security/authorization.test.js — Testes de Identificação Numérica e Controlo de Acesso
import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyUser, authorizeUserByAdmin, listAuthorizedUsers } from '../../src/security/authorization.js';
import { AuthorizationError } from '../../src/utils/errors.js';

test('Segurança: Identificação do Administrador Principal', async () => {
  const adminId = '950415577';
  const user = await identifyUser(adminId, 'André Pinheiro');

  assert.ok(user, 'Administrador deve ser reconhecido');
  assert.equal(user.role, 'Chefia');
  assert.equal(user.numero, '1688');
  assert.equal(user.authorized, true);
});

test('Segurança: Rejeição de Utilizador Desconhecido', async () => {
  const unknownId = '999888777666';
  const user = await identifyUser(unknownId, 'Intruso');

  assert.equal(user, null, 'Utilizador sem registo prévio deve retornar null');
});

test('Segurança: Autorização Delegada por Chefia', async () => {
  const adminId = '950415577';
  const newMotoristaId = '777123456';

  // 1. Autorização válida efetuada pela Chefia
  const authorized = await authorizeUserByAdmin(
    adminId,
    newMotoristaId,
    '2001',
    'Motorista',
    'Manuel Motorista Teste'
  );
  assert.ok(authorized);
  assert.equal(authorized.role, 'Motorista');

  // 2. O novo motorista agora é identificado com sucesso
  const identified = await identifyUser(newMotoristaId, 'Manuel');
  assert.ok(identified);
  assert.equal(identified.role, 'Motorista');
  assert.equal(identified.numero, '2001');

  // 3. Tentativa de autorização efetuada por um NÃO-ADMIN deve ser rejeitada
  await assert.rejects(
    () => authorizeUserByAdmin(
      newMotoristaId, // Motorista a tentar autorizar outro
      '555444333',
      '9999',
      'Chefia',
      'Falso Admin'
    ),
    AuthorizationError
  );
});

test('Segurança: Listagem de Utilizadores Autorizados', () => {
  const list = listAuthorizedUsers();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 1);
  assert.ok(list.some(u => String(u.telegramId) === '950415577' && u.role === 'Chefia'));
});
