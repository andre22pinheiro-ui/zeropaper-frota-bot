// src/database/repositories/hygieneRepository.js — Acesso a Dados da Tabela 'higienizacoes'
import { supabase, executeQuery } from '../supabase.js';

export class HygieneRepository {
  async insert(record) {
    return await executeQuery(
      supabase
        .from('higienizacoes')
        .insert({
          viatura_id: record.viatura_id,
          tipo: record.tipo || 'Desinfeção e Lavagem Completa',
          observacoes: record.observacoes || null,
          data_higienizacao: record.data_higienizacao || new Date().toISOString().slice(0, 10),
          estado: record.estado || 'Concluído'
        })
        .select()
        .single(),
      'HygieneRepository.insert'
    );
  }

  async getRecent(limit = 10) {
    return await executeQuery(
      supabase
        .from('higienizacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      'HygieneRepository.getRecent'
    );
  }
}

export const hygieneRepository = new HygieneRepository();
export default hygieneRepository;

