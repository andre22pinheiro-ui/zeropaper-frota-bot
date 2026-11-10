// src/security/authorization.js — Identificação Numérica e Controlo de Acesso
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { AuthorizationError } from '../utils/errors.js';
import { personnelRepository } from '../database/repositories/personnelRepository.js';

const log = createLogger('SecurityAuth');

const USERS_MAP_FILE = path.resolve('./data/users_map.json');

// Carrega mapeamento local Telegram ID -> Perfil e Funcionário
function loadUsersMap() {
  const adminId = String(process.env.ADMIN_TELEGRAM_ID || '950415577');
  const defaultMap = {
    [adminId]: {
      role: 'Chefia',
      name: 'André Rafael Macedo Pinheiro',
      numero: '1688',
      authorized: true,
      registeredAt: new Date().toISOString()
    }
  };

  try {
    if (fs.existsSync(USERS_MAP_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_MAP_FILE, 'utf8'));
      return { ...defaultMap, ...data };
    }
  } catch (err) {
    log.error('Erro ao ler users_map.json:', err.message);
  }

  saveUsersMap(defaultMap);
  return defaultMap;
}

function saveUsersMap(map) {
  try {
    const dir = path.dirname(USERS_MAP_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_MAP_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (err) {
    log.error('Erro ao guardar users_map.json:', err.message);
  }
}

let activeUsersMap = loadUsersMap();

/**
 * Identifica o utilizador pelo Telegram ID numérico (from.id)
 */
export async function identifyUser(fromId, fromName = 'Utilizador') {
  const uid = String(fromId || '').trim();
  if (!uid) throw new AuthorizationError('Telegram ID não fornecido.');

  // 1. Verificar mapa ativo
  if (activeUsersMap[uid] && activeUsersMap[uid].authorized) {
    return {
      telegramId: uid,
      ...activeUsersMap[uid]
    };
  }

  // 2. Se for o Admin configurado nas variáveis de ambiente
  const adminId = String(process.env.ADMIN_TELEGRAM_ID || '950415577');
  if (uid === adminId) {
    const adminUser = {
      role: 'Chefia',
      name: 'André Rafael Macedo Pinheiro',
      numero: '1688',
      authorized: true,
      registeredAt: new Date().toISOString()
    };
    activeUsersMap[uid] = adminUser;
    saveUsersMap(activeUsersMap);
    return { telegramId: uid, ...adminUser };
  }

  // Utilizador desconhecido ou não autorizado
  log.warn(`Tentativa de acesso não autorizada: Telegram ID ${uid} (${fromName})`);
  return null;
}

/**
 * Regista ou autoriza um novo utilizador pelo Telegram ID (apenas por Chefia)
 */
export async function authorizeUserByAdmin(adminFromId, targetTelegramId, numeroFuncionario, role = 'Motorista') {
  const admin = await identifyUser(adminFromId);
  if (!admin || admin.role !== 'Chefia') {
    throw new AuthorizationError('Apenas administradores (Chefia) podem autorizar novos utilizadores.');
  }

  const funcionario = await personnelRepository.findByNumero(numeroFuncionario);
  const name = funcionario?.nome || `Operador ${numeroFuncionario}`;
  const resolvedRole = funcionario?.perfil || role;

  const targetUid = String(targetTelegramId).trim();
  activeUsersMap[targetUid] = {
    role: resolvedRole,
    name,
    numero: String(numeroFuncionario),
    authorized: true,
    registeredAt: new Date().toISOString(),
    authorizedBy: admin.name
  };

  saveUsersMap(activeUsersMap);
  log.info(`Utilizador ${name} (ID: ${targetUid}, N.º ${numeroFuncionario}, Perfil: ${resolvedRole}) autorizado por ${admin.name}`);
  return activeUsersMap[targetUid];
}

/**
 * Lista utilizadores autorizados
 */
export function listAuthorizedUsers() {
  return activeUsersMap;
}

export default {
  identifyUser,
  authorizeUserByAdmin,
  listAuthorizedUsers
};

