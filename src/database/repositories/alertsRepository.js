// src/database/repositories/alertsRepository.js — Repositório Integrado de Alertas da Frota e Documentos
import { supabase, executeQuery } from '../supabase.js';

export class AlertsRepository {
  async getSystemAlerts(limit = 20) {
    return await executeQuery(
      supabase
        .from('alertas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      'AlertsRepository.getSystemAlerts'
    );
  }

  async getVehicleAlertData() {
    return await executeQuery(
      supabase
        .from('viaturas')
        .select('id, matricula, marca_modelo, tipo, quilometragem, proxima_revisao_km, proxima_inspecao, proxima_inspecao_passageiros, proxima_inspecao_criancas')
        .order('matricula', { ascending: true }),
      'AlertsRepository.getVehicleAlertData'
    );
  }

  async getPersonnelDocumentAlerts() {
    return await executeQuery(
      supabase
        .from('documentos_pessoal')
        .select('*')
        .order('data_validade', { ascending: true }),
      'AlertsRepository.getPersonnelDocumentAlerts'
    );
  }
}

export const alertsRepository = new AlertsRepository();
export default alertsRepository;
