// src/workflows/idempotency.js — Prevenção de Duplicações e Garantia de Idempotência
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Idempotency');

// Armazena hashes de pedidos processados recentemente (TTL de 10 minutos)
const processedKeys = new Map(); // key -> { timestamp, result }
const TTL_MS = 10 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [key, value] of processedKeys.entries()) {
    if (now - value.timestamp > TTL_MS) {
      processedKeys.delete(key);
    }
  }
}

// Limpeza periódica a cada 5 minutos
setInterval(cleanup, 5 * 60 * 1000).unref();

/**
 * Gera uma chave única de idempotência
 */
export function generateKey(userId, operationType, payload = {}) {
  const serialized = JSON.stringify({
    uid: String(userId),
    op: operationType,
    p: payload
  });
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Verifica se a operação já foi processada recentemente
 */
export function isAlreadyProcessed(key) {
  cleanup();
  return processedKeys.has(key);
}

/**
 * Regista o resultado da operação como concluída
 */
export function recordExecution(key, result = true) {
  processedKeys.set(key, {
    timestamp: Date.now(),
    result
  });
  log.debug(`Chave de idempotência registada: ${key.slice(0, 12)}...`);
}

/**
 * Obtém o resultado de uma operação já processada
 */
export function getPreviousResult(key) {
  const item = processedKeys.get(key);
  return item ? item.result : null;
}

export default {
  generateKey,
  isAlreadyProcessed,
  recordExecution,
  getPreviousResult
};

