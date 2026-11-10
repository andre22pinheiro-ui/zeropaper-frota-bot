// src/database/repositories/anomalyRepository.js — Acesso a Dados da Tabela 'anomalias'
import { supabase, executeQuery } from '../supabase.js';

export class AnomalyRepository {
  async insert(record) {
    return await executeQuery(
      supabase
        .from('anomalias')
        .insert({
          viatura_id: record.viatura_id || null,
          matricula: record.matricula || null,
          tipo: record.tipo || 'avaria',
          descricao: record.descricao,
          prioridade: record.prioridade || 'Média',
          estado: record.estado || 'Pendente',
          imobiliza: Boolean(record.imobiliza),
          resolvido: false,
          nome_funcionario: record.nome_funcionario || null,
          numero_funcionario: record.numero_funcionario ? String(record.numero_funcionario) : null,
          data: record.data || new Date().toISOString().slice(0, 10),
          latitude: record.latitude || null,
          longitude: record.longitude || null,
          localizacao: record.localizacao || null,
          evidencia: record.evidencia || []
        })
        .select()
        .single(),
      'AnomalyRepository.insert'
    );
  }

  async getPending(limit = 20) {
    return await executeQuery(
      supabase
        .from('anomalias')
        .select('*')
        .eq('resolvido', false)
        .order('created_at', { ascending: false })
        .limit(limit),
      'AnomalyRepository.getPending'
    );
  }

  async getByMatricula(matricula) {
    const clean = String(matricula).toUpperCase().trim();
    return await executeQuery(
      supabase
        .from('anomalias')
        .select('*')
        .eq('matricula', clean)
        .order('created_at', { ascending: false }),
      'AnomalyRepository.getByMatricula'
    );
  }
}

export const anomalyRepository = new AnomalyRepository();
export default anomalyRepository;
