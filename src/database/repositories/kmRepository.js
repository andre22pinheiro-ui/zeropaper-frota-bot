// src/database/repositories/kmRepository.js — Acesso a Dados da Tabela 'km_registos'
import { supabase, executeQuery } from '../supabase.js';

export class KmRepository {
  async insert(record) {
    return await executeQuery(
      supabase
        .from('km_registos')
        .insert({
          matricula: record.matricula,
          viatura: record.viatura || record.matricula,
          km_inicio: record.km_inicio,
          km_fim: record.km_fim,
          total: record.total,
          observacoes: record.observacoes || null,
          nome_funcionario: record.nome_funcionario || '',
          numero_funcionario: String(record.numero_funcionario || ''),
          data: record.data || new Date().toISOString().slice(0, 10),
          inicio_em: record.inicio_em || new Date().toISOString(),
          fim_em: record.fim_em || new Date().toISOString(),
          lat_inicio: record.lat_inicio || null,
          lng_inicio: record.lng_inicio || null,
          lat_fim: record.lat_fim || null,
          lng_fim: record.lng_fim || null
        })
        .select()
        .single(),
      'KmRepository.insert'
    );
  }

  async getLatestByMatricula(matricula) {
    const clean = String(matricula).toUpperCase().trim();
    return await executeQuery(
      supabase
        .from('km_registos')
        .select('*')
        .eq('matricula', clean)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      'KmRepository.getLatestByMatricula'
    );
  }

  async getRecent(limit = 10) {
    return await executeQuery(
      supabase
        .from('km_registos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      'KmRepository.getRecent'
    );
  }
}

export const kmRepository = new KmRepository();
export default kmRepository;

