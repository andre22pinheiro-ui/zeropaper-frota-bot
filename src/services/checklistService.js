// src/services/checklistService.js — Vistorias e Checklists Diárias de Conformidade
import { fleetService, APP_BASE_URL } from './fleetService.js';
import { checklistRepository } from '../database/repositories/checklistRepository.js';
import { enforcePermission } from '../security/permissions.js';
import { NotFoundError } from '../utils/errors.js';

export class ChecklistService {
  async prepareChecklist(user, matriculaOrQuery, observacoes = 'Conforme sem anomalias', itens = {}) {
    enforcePermission(user, 'submit_checklist', 'registar checklist de viatura');

    const viatura = await fleetService.findVehicle(matriculaOrQuery);
    if (!viatura) {
      throw new NotFoundError(`Viatura "${matriculaOrQuery}" não encontrada.`);
    }

    const payload = {
      viaturaId: viatura.id,
      matricula: viatura.matricula,
      modelo: viatura.marca_modelo || viatura.tipo || 'Viatura',
      quilometragem: viatura.quilometragem || null,
      observacoes: observacoes || 'Verificação diária concluída sem anomalias.',
      dados: {
        certificado_matricula: itens.certificado || 'OK',
        ficha_inspeccao: itens.inspeccao || 'OK',
        seguro: itens.seguro || 'OK',
        limpeza: itens.limpeza || 'OK',
        luzes: itens.luzes || 'OK',
        pneus: itens.pneus || 'OK',
        horario: new Date().toISOString()
      },
      funcionarioNome: user.name,
      funcionarioNum: user.numero
    };

    const preview = 
      `🚗 Viatura: *${payload.matricula}* (${payload.modelo})\n` +
      `📋 Vistoria: **Documentos, Seguro, Pneus e Luzes**\n` +
      `✅ Estado: **Aprovado para Circulação**\n` +
      `📝 Notas: _"${payload.observacoes}"_\n` +
      `👤 Inspecionado por: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n`;

    return { payload, preview };
  }

  async executeChecklist(payload) {
    await checklistRepository.insert({
      viatura_id: payload.viaturaId,
      matricula: payload.matricula,
      marca_modelo: payload.modelo,
      quilometragem: payload.quilometragem,
      observacoes: payload.observacoes,
      concluido: true,
      dados: payload.dados
    });

    return (
      `📋 *[ZeroPaperFrota] Checklist Diário Validado!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚗 Viatura: **${payload.matricula}** (${payload.modelo})\n` +
      `✅ Conformidade: **Aprovado para Circulação**\n` +
      `👤 Responsável: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n` +
      `📅 Data: ${new Date().toLocaleDateString('pt-PT')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 [Ver Checklists no AppFrota](${APP_BASE_URL}/frota)`
    );
  }
}

export const checklistService = new ChecklistService();
export default checklistService;

