// src/database/repositories/scheduleRepository.js — Acesso a Dados da Tabela 'escalas'
import { supabase, executeQuery } from '../supabase.js';

export class ScheduleRepository {
  async getAll(limit = 30) {
    return await executeQuery(
      supabase
        .from('escalas')
        .select('*')
        .order('data', { ascending: false })
        .limit(limit),
      'ScheduleRepository.getAll'
    );
  }

  async getByDate(dateString) {
    return await executeQuery(
      supabase
        .from('escalas')
        .select('*')
        .eq('data', dateString)
        .order('turno', { ascending: true }),
      'ScheduleRepository.getByDate'
    );
  }

  async getByDriver(driverQuery) {
    const qClean = String(driverQuery || '').trim();
    return await executeQuery(
      supabase
        .from('escalas')
        .select('*')
        .ilike('motorista', `%${qClean}%`)
        .order('data', { ascending: false })
        .limit(20),
      'ScheduleRepository.getByDriver'
    );
  }

  async insert(record) {
    return await executeQuery(
      supabase
        .from('escalas')
        .insert({
          data: record.data,
          turno: record.turno || '07:00 - 13:00',
          motorista: record.motorista || null,
          matricula: record.matricula || null,
          viatura_id: record.viatura_id || null,
          descricao: record.descricao || null,
          alunos: record.alunos || null
        })
        .select()
        .single(),
      'ScheduleRepository.insert'
    );
  }
}

export const scheduleRepository = new ScheduleRepository();
export default scheduleRepository;
