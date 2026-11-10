// src/database/repositories/checklistRepository.js — Acesso a Dados da Tabela 'checklists'
import { supabase, executeQuery } from '../supabase.js';

export class ChecklistRepository {
  async insert(record) {
    return await executeQuery(
      supabase
        .from('checklists')
        .insert({
          viatura_id: record.viatura_id,
          matricula: record.matricula || null,
          marca_modelo: record.marca_modelo || null,
          quilometragem: record.quilometragem ? parseInt(record.quilometragem, 10) : null,
          observacoes: record.observacoes || 'Checklist diária concluída sem anomalias.',
          concluido: Boolean(record.concluido !== false),
          dados: record.dados || {}
        })
        .select()
        .single(),
      'ChecklistRepository.insert'
    );
  }

  async getRecent(limit = 10) {
    return await executeQuery(
      supabase
        .from('checklists')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      'ChecklistRepository.getRecent'
    );
  }
}

export const checklistRepository = new ChecklistRepository();
export default checklistRepository;
