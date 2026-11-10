// src/services/maintenanceService.js — Registo de Serviços de Oficina e Manutenção
import { fleetService, APP_BASE_URL } from './fleetService.js';
import { maintenanceRepository } from '../database/repositories/maintenanceRepository.js';
import { enforcePermission } from '../security/permissions.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class MaintenanceService {
  async prepareMaintenance(user, matriculaOrQuery, descricao, custo = 0, titulo = 'Serviço Operacional / Oficina') {
    enforcePermission(user, 'submit_maintenance', 'registar serviço de oficina');

    if (!descricao || descricao.trim().length < 3) {
      throw new ValidationError('A descrição da manutenção é obrigatória.');
    }

    const viatura = await fleetService.findVehicle(matriculaOrQuery);
    if (!viatura) {
      throw new NotFoundError(`Viatura "${matriculaOrQuery}" não encontrada.`);
    }

    const custoNum = parseFloat(custo) || 0;
    if (custoNum < 0) {
      throw new ValidationError('O custo da intervenção não pode ser negativo.');
    }

    const payload = {
      viaturaId: viatura.id,
      matricula: viatura.matricula,
      modelo: viatura.marca_modelo || viatura.tipo || 'Viatura',
      titulo,
      descricao: descricao.trim(),
      custo: custoNum,
      funcionarioNome: user.name,
      funcionarioNum: user.numero
    };

    const preview = 
      `🚗 Viatura: *${payload.matricula}* (${payload.modelo})\n` +
      `🛠️ Intervenção: *${payload.descricao}*\n` +
      `💶 Custo Estimado: **${payload.custo > 0 ? payload.custo.toFixed(2) + ' €' : 'Sob orçamento'}**\n` +
      `👤 Mecânico / Responsável: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n`;

    return { payload, preview };
  }

  async executeMaintenance(payload) {
    await maintenanceRepository.insert({
      viatura_id: payload.viaturaId,
      titulo: payload.titulo,
      descricao: payload.descricao,
      custo: payload.custo,
      motorista: payload.funcionarioNome
    });

    return (
      `🔧 *[ZeroPaperFrota] Serviço de Oficina Registado!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚗 Viatura: **${payload.matricula}** (${payload.modelo})\n` +
      `🛠️ Intervenção: *${payload.descricao}*\n` +
      `💶 Custo: **${payload.custo > 0 ? payload.custo.toFixed(2) + ' €' : 'Não especificado'}**\n` +
      `👤 Técnico: *${payload.funcionarioNome}*\n` +
      `📅 Data: ${new Date().toLocaleDateString('pt-PT')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 [Ver Oficina no AppFrota](${APP_BASE_URL}/oficina)`
    );
  }
}

export const maintenanceService = new MaintenanceService();
export default maintenanceService;
