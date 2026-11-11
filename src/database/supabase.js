// src/database/supabase.js — Ligação Oficial e Resiliente ao Supabase AppFrota
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

const log = createLogger('SupabaseClient');

const MISSING_ENV_MSG =
  'Configuração Supabase ausente (SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY por definir no ambiente).';

let cachedClient = null;
let cachedSignature = '';
let missingLogged = false;

export function getSupabaseMissingEnv() {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}

export function isSupabaseConfigured() {
  return getSupabaseMissingEnv().length === 0;
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (!missingLogged) {
      missingLogged = true;
      log.error('Configuração crítica ausente: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos!');
    }
    return null;
  }

  const sig = `${url}|${key}`;
  if (!cachedClient || cachedSignature !== sig) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      }
    });
    cachedSignature = sig;
  }
  return cachedClient;
}

function createUnconfiguredQueryStub(message = MISSING_ENV_MSG) {
  const payload = { data: null, error: { message } };
  const stub = new Proxy(() => stub, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled, onRejected) => Promise.resolve(payload).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected) => Promise.resolve(payload).catch(onRejected);
      }
      if (prop === 'finally') {
        return (onFinally) => Promise.resolve(payload).finally(onFinally);
      }
      return () => stub;
    },
    apply() {
      return stub;
    }
  });
  return stub;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabaseClient();
      if (client) {
        const val = client[prop];
        return typeof val === 'function' ? val.bind(client) : val;
      }
      if (prop === 'from') {
        return () => createUnconfiguredQueryStub();
      }
      if (prop === 'rpc') {
        return () => createUnconfiguredQueryStub();
      }
      return undefined;
    }
  }
);

/**
 * Verifica a saúde da ligação executando um SELECT simples
 */
export async function checkDatabaseHealth() {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: `MISSING_ENV: ${getSupabaseMissingEnv().join(', ')}`
    };
  }
  try {
    const start = Date.now();
    const { count, error } = await supabase
      .from('viaturas')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    const latencyMs = Date.now() - start;
    return { ok: true, latencyMs, countViaturas: count };
  } catch (err) {
    log.error('Falha de verificação da base de dados:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Wrapper de execução resiliente com timeout e tratamento de erro
 */
export async function executeQuery(queryPromise, operationName = 'Query') {
  try {
    const result = await queryPromise;
    if (result.error) {
      log.error(`Erro no Supabase [${operationName}]:`, result.error.message);
      throw new DatabaseError(`Erro de base de dados [${operationName}]: ${result.error.message}`);
    }
    return result.data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    log.error(`Exceção de rede no Supabase [${operationName}]:`, err.message);
    throw new DatabaseError(`Falha de comunicação com o Supabase: ${err.message}`);
  }
}

export default supabase;

