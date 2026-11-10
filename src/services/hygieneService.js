// src/services/hygieneService.js — Registo de Limpeza e Desinfeção de Viaturas
import { fleetService, APP_BASE_URL } from './fleetService.js';
import { hygieneRepository } from '../database/repositories/hygieneRepository.js';
import { enforcePermission } from '../security/permissions.js';
import { NotFoundError } from '../utils/errors.js';

export class HygieneService {
  async prepareHygiene(user, matriculaOrQuery, tipo = 'Desinfeção e Lavagem Completa', observacoes = '') {
    enforcePermission(user, 'submit_hygiene', 'registar higienização');

    const viatura = await fleetService.findVehicle(matriculaOrQuery);
    if (!viatura) {
      throw new NotFoundError(`Viatura "${matriculaOrQuery}" não encontrada.`);
    }

    const payload = {
      viaturaId: viatura.id,
      matricula: viatura.matricula,
      modelo: viatura.marca_modelo || viatura.tipo || 'Viatura',
      tipo: tipo || 'Desinfeção e Lavagem Completa',
      observacoes,
      funcionarioNome: user.name,
      funcionarioNum: user.numero
    };

    let preview = 
      `🚗 Viatura: *${payload.matricula}* (${payload.modelo})\n` +
      `✨ Serviço: *${payload.tipo}*\n` +
      `👤 Efetuado por: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n`;

    if (observacoes) {
      preview += `📝 Notas: _"${observacoes}"_\n`;
    }

    return { payload, preview };
  }

  async executeHygiene(payload) {
    await hygieneRepository.insert({
      viatura_id: payload.viaturaId,
      tipo: payload.tipo,
      observacoes: payload.observacoes || 'Higienização registada via ZeroPaperFrota Bot',
      estado: 'Concluído'
    });

    return (
      `🧼 *[ZeroPaperFrota] Higienização Concluída!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚗 Viatura: **${payload.matricula}** (${payload.modelo})\n` +
      `✨ Serviço: *${payload.tipo}*\n` +
      `👤 Operador: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n` +
      `📅 Data: ${new Date().toLocaleDateString('pt-PT')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 [Ver Higienizações no AppFrota](${APP_BASE_URL}/frota)`
    );
  }
}

export const hygieneService = new HygieneService();
export default hygieneService;
