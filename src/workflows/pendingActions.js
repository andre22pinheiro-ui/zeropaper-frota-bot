// src/workflows/pendingActions.js — Máquina de Estados para Ações Pendentes de Confirmação
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const log = createLogger('PendingActions');

// actionId -> { id, userId, operation, payload, state, createdAt, expiresAt }
const actionsMap = new Map();
const ACTION_TTL_MS = 5 * 60 * 1000; // 5 minutos para confirmar

function cleanupExpired() {
  const now = Date.now();
  for (const [id, act] of actionsMap.entries()) {
    if (now > act.expiresAt) {
      actionsMap.delete(id);
    }
  }
}

setInterval(cleanupExpired, 60 * 1000).unref();

/**
 * Cria uma ação pendente de confirmação
 */
export function createPendingAction(userId, operation, payload) {
  cleanupExpired();
  const id = crypto.randomBytes(6).toString('hex'); // 12 chars
  const now = Date.now();

  const action = {
    id,
    userId: String(userId),
    operation,
    payload,
    state: 'pending',
    createdAt: now,
    expiresAt: now + ACTION_TTL_MS
  };

  actionsMap.set(id, action);
  log.info(`Ação pendente criada [${id}]: ${operation} pelo utilizador ${userId}`);
  return action;
}

/**
 * Obtém uma ação pendente garantindo que pertence ao utilizador
 */
export function getPendingAction(actionId, userId) {
  cleanupExpired();
  const act = actionsMap.get(actionId);
  if (!act) return null;
  if (act.userId !== String(userId)) {
    log.warn(`Tentativa de confirmação de ação [${actionId}] por utilizador diferente (${userId} vs ${act.userId})`);
    return null;
  }
  return act;
}

/**
 * Consome (confirma e remove) a ação pendente
 */
export function consumePendingAction(actionId, userId) {
  const act = getPendingAction(actionId, userId);
  if (!act) return null;
  act.state = 'completed';
  actionsMap.delete(actionId);
  return act;
}

/**
 * Cancela uma ação pendente
 */
export function cancelPendingAction(actionId, userId) {
  const act = getPendingAction(actionId, userId);
  if (!act) return null;
  act.state = 'cancelled';
  actionsMap.delete(actionId);
  log.info(`Ação pendente [${actionId}] cancelada pelo utilizador ${userId}`);
  return act;
}

export default {
  createPendingAction,
  getPendingAction,
  consumePendingAction,
  cancelPendingAction
};
