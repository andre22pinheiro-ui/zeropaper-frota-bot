// src/services/kmService.js — Registo e Validação de Quilometragens e Turnos
import { fleetService, APP_BASE_URL } from './fleetService.js';
import { fleetRepository } from '../database/repositories/fleetRepository.js';
import { kmRepository } from '../database/repositories/kmRepository.js';
import { validateOdometer } from '../security/validation.js';
import { enforcePermission } from '../security/permissions.js';
import { NotFoundError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('KmService');

export class KmService {
  /**
   * Prepara os dados para o registo e valida inconsistências antes da confirmação
   */
  async prepareKmRegistration(user, matriculaOrQuery, novoKm, observacoes = '') {
    enforcePermission(user, 'register_km', 'registar quilometragem');

    const viatura = await fleetService.findVehicle(matriculaOrQuery);
    if (!viatura) {
      throw new NotFoundError(`Viatura com matrícula ou modelo "${matriculaOrQuery}" não encontrada.`);
    }

    const anterior = viatura.quilometragem || 0;
    const validation = validateOdometer(novoKm, anterior);

    const payload = {
      viaturaId: viatura.id,
      matricula: viatura.matricula,
      modelo: viatura.marca_modelo || viatura.tipo || 'Viatura',
      kmInicio: anterior,
      kmFim: validation.novoKm,
      total: validation.diferenca,
      isAnomalous: validation.isAnomalous,
      observacoes,
      funcionarioNome: user.name,
      funcionarioNum: user.numero
    };

    let preview = 
      `🚗 Viatura: *${payload.matricula}* (${payload.modelo})\n` +
      `🔢 Odómetro Atual: **${payload.kmInicio.toLocaleString('pt-PT')} km**\n` +
      `🏁 Novo Odómetro: **${payload.kmFim.toLocaleString('pt-PT')} km**\n` +
      `📈 Distância no Turno: **+${payload.total} km**\n` +
      `👤 Condutor: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n`;

    if (observacoes) {
      preview += `📝 Obs: _"${observacoes}"_\n`;
    }

    if (validation.isAnomalous) {
      preview += `\n⚠️ *Aviso de Distância Elevada:* A deslocação (+${payload.total} km) excede 1000 km num único turno. Confirma se o valor está correto.`;
    }

    return { payload, preview };
  }

  /**
   * Executa a gravação efetiva após confirmação pelo utilizador
   */
  async executeKmRegistration(payload) {
    const hoje = new Date().toISOString().slice(0, 10);
    const agora = new Date().toISOString();

    // 1. Atualizar odómetro da viatura
    await fleetRepository.updateKm(payload.viaturaId, payload.kmFim);

    // 2. Inserir histórico em km_registos
    const reg = await kmRepository.insert({
      matricula: payload.matricula,
      viatura: payload.modelo,
      km_inicio: payload.kmInicio,
      km_fim: payload.kmFim,
      total: payload.total,
      observacoes: payload.observacoes || 'Registo validado via ZeroPaperFrota Bot',
      nome_funcionario: payload.funcionarioNome,
      numero_funcionario: payload.funcionarioNum,
      data: hoje,
      inicio_em: agora,
      fim_em: agora
    });

    log.info(`Quilometragem registada: ${payload.matricula} atualizada para ${payload.kmFim} km (+${payload.total} km)`);

    return (
      `✅ *[ZeroPaperFrota] Quilometragem Gravada com Sucesso!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚗 Viatura: **${payload.matricula}** (${payload.modelo})\n` +
      `🔢 Novo Odómetro: **${payload.kmFim.toLocaleString('pt-PT')} km**\n` +
      `📈 Distância Percorrida: **+${payload.total} km**\n` +
      `👤 Condutor: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n` +
      `📅 Data: ${new Date().toLocaleDateString('pt-PT')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 [Ver no AppFrota Web](${APP_BASE_URL}/frota)`
    );
  }
}

export const kmService = new KmService();
export default kmService;

