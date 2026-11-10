// src/services/anomalyService.js — Registo de Anomalias e Avarias com Gestão de Segurança
import { fleetService, APP_BASE_URL } from './fleetService.js';
import { fleetRepository } from '../database/repositories/fleetRepository.js';
import { anomalyRepository } from '../database/repositories/anomalyRepository.js';
import { analyzeSafetyRisk } from '../security/validation.js';
import { enforcePermission } from '../security/permissions.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('AnomalyService');

export class AnomalyService {
  async prepareAnomalyReport(user, matriculaOrQuery, descricao, prioridade = 'Média', imobiliza = false, evidencia = []) {
    enforcePermission(user, 'report_anomaly', 'reportar anomalia ou avaria');

    if (!descricao || descricao.trim().length < 3) {
      throw new ValidationError('A descrição da anomalia é obrigatória (mínimo 3 caracteres).');
    }

    const viatura = matriculaOrQuery ? await fleetService.findVehicle(matriculaOrQuery) : null;
    const safety = analyzeSafetyRisk(descricao);

    const resolvedPrioridade = safety.isSafetyCritical ? 'Urgente' : prioridade;
    const resolvedImobiliza = safety.isSafetyCritical ? true : Boolean(imobiliza);

    const payload = {
      viaturaId: viatura?.id || null,
      matricula: viatura?.matricula || (matriculaOrQuery ? String(matriculaOrQuery).toUpperCase() : 'Geral'),
      modelo: viatura?.marca_modelo || 'Frota Geral',
      descricao: descricao.trim(),
      prioridade: resolvedPrioridade,
      imobiliza: resolvedImobiliza,
      isSafetyCritical: safety.isSafetyCritical,
      safetyTerms: safety.terms,
      funcionarioNome: user.name,
      funcionarioNum: user.numero,
      evidencia
    };

    let preview = 
      `🚗 Viatura: *${payload.matricula}* (${payload.modelo})\n` +
      `⚠️ Descrição: _"${payload.descricao}"_\n` +
      `⚡ Prioridade: **${payload.prioridade}**\n` +
      `🚦 Imobiliza Viatura: **${payload.imobiliza ? 'SIM (Encaminhar para Oficina)' : 'NÃO (Operacional)'}**\n` +
      `👤 Reportado por: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n`;

    if (payload.isSafetyCritical) {
      preview += `\n🚨 *ALERTA DE SEGURANÇA:* Detetados componentes críticos (${payload.safetyTerms.join(', ')}). A viatura será imediatamente imobilizada no sistema.`;
    }

    return { payload, preview };
  }

  async executeAnomalyReport(payload) {
    const reg = await anomalyRepository.insert({
      viatura_id: payload.viaturaId,
      matricula: payload.matricula,
      descricao: payload.descricao,
      prioridade: payload.prioridade,
      imobiliza: payload.imobiliza,
      nome_funcionario: payload.funcionarioNome,
      numero_funcionario: payload.funcionarioNum,
      evidencia: payload.evidencia || []
    });

    if (payload.imobiliza && payload.viaturaId) {
      await fleetRepository.updateStatus(payload.viaturaId, 'manutencao');
      log.warn(`Viatura ${payload.matricula} imobilizada e colocada em estado de manutenção.`);
    }

    const imobBadge = payload.imobiliza
      ? `⛔ *VIATURA IMOBILIZADA — Encaminhada para Manutenção*`
      : `🟡 *Viatura Operacional — Anomalia para Triagem*`;

    return (
      `🚨 *[ZeroPaperFrota] Anomalia Registada na Oficina!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚗 Viatura: **${payload.matricula}** (${payload.modelo})\n` +
      `⚠️ Avaria: _"${payload.descricao}"_\n` +
      `⚡ Prioridade: **${payload.prioridade}**\n` +
      `🚦 Estado: ${imobBadge}\n` +
      `👤 Reportado por: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n` +
      `📅 Data: ${new Date().toLocaleDateString('pt-PT')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔧 [Abrir Oficina no AppFrota](${APP_BASE_URL}/oficina)`
    );
  }
}

export const anomalyService = new AnomalyService();
export default anomalyService;
