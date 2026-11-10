// src/database/repositories/fleetRepository.js — Acesso a Dados da Tabela 'viaturas'
import { supabase, executeQuery } from '../supabase.js';

export class FleetRepository {
  async getAll() {
    return await executeQuery(
      supabase
        .from('viaturas')
        .select('id, matricula, marca_modelo, tipo, status, quilometragem, proxima_inspecao, proxima_revisao_km, created_at')
        .order('matricula', { ascending: true }),
      'FleetRepository.getAll'
    );
  }

  async findByMatricula(matricula) {
    const clean = String(matricula).toUpperCase().trim();
    const data = await executeQuery(
      supabase
        .from('viaturas')
        .select('*')
        .eq('matricula', clean)
        .maybeSingle(),
      'FleetRepository.findByMatricula'
    );
    return data;
  }

  async findById(id) {
    return await executeQuery(
      supabase
        .from('viaturas')
        .select('*')
        .eq('id', id)
        .maybeSingle(),
      'FleetRepository.findById'
    );
  }

  async updateKm(id, newKm) {
    return await executeQuery(
      supabase
        .from('viaturas')
        .update({ quilometragem: parseInt(newKm, 10) })
        .eq('id', id)
        .select()
        .single(),
      'FleetRepository.updateKm'
    );
  }

  async updateStatus(id, newStatus) {
    return await executeQuery(
      supabase
        .from('viaturas')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single(),
      'FleetRepository.updateStatus'
    );
  }
}

export const fleetRepository = new FleetRepository();
export default fleetRepository;

