// src/database/repositories/maintenanceRepository.js — Acesso a Dados da Tabela 'servicos'
import { supabase, executeQuery } from '../supabase.js';

export class MaintenanceRepository {
  async insert(record) {
    return await executeQuery(
      supabase
        .from('servicos')
        .insert({
          viatura_id: record.viatura_id,
          titulo: record.titulo || 'Serviço Operacional / Oficina',
          descricao: record.descricao,
          custo: parseFloat(record.custo) || 0,
          motorista: record.motorista || null,
          data: record.data || new Date().toISOString().slice(0, 10),
          data_servico: record.data_servico || new Date().toISOString().slice(0, 10)
        })
        .select()
        .single(),
      'MaintenanceRepository.insert'
    );
  }

  async getRecent(limit = 10) {
    return await executeQuery(
      supabase
        .from('servicos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      'MaintenanceRepository.getRecent'
    );
  }
}

export const maintenanceRepository = new MaintenanceRepository();
export default maintenanceRepository;
