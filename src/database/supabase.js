// src/database/supabase.js — Ligação Oficial e Resiliente ao Supabase AppFrota
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

const log = createLogger('SupabaseClient');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  log.error('Configuração crítica ausente: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env!');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  }
});

/**
 * Verifica a saúde da ligação executando um SELECT simples
 */
export async function checkDatabaseHealth() {
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

