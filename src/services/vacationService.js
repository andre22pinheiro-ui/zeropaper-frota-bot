// src/services/vacationService.js — Gestão de Pedidos de Férias e Ausências
// Transplantado e harmonizado a partir de appfrota-main/app/api/ferias/pedidos/route.ts
import { vacationRepository } from '../database/repositories/vacationRepository.js';

export class VacationService {
  async getVacationReport(user, filter = '') {
    const isChefia = user?.role === 'Chefia' || user?.role === 'Secretaria';
    const cleanFilter = String(filter || '').toLowerCase().trim();

    if (cleanFilter === 'pendentes' || (isChefia && !cleanFilter)) {
      const pending = await vacationRepository.getPending();
      return this.formatPendingVacations(pending, isChefia);
    }

    if (cleanFilter && /^\d+$/.test(cleanFilter)) {
      const byNum = await vacationRepository.getByPersonnel(cleanFilter);
      return this.formatPersonnelVacations(cleanFilter, byNum);
    }

    // Por defeito para motoristas: seus próprios pedidos
    if (user?.numero) {
      const myVacations = await vacationRepository.getByPersonnel(user.numero);
      if (myVacations && myVacations.length > 0) {
        return this.formatPersonnelVacations(user.numero, myVacations, user.name);
      }
    }

    const all = await vacationRepository.getAll(15);
    return this.formatGeneralVacations(all);
  }

  formatPendingVacations(items, isChefia) {
    let out = `🏖️ *Pedidos de Férias Pendentes de Decisão*\n\n`;
    if (!items || items.length === 0) {
      out += `_Não existem pedidos de férias pendentes de aprovação neste momento._\n\n`;
      out += `✅ Todos os processos encontram-se decididos ou arquivados.`;
      return out;
    }

    items.forEach((p, idx) => {
      out += `*${idx + 1}. ${p.nome_funcionario}* (N.º ${p.numero_funcionario} - ${p.perfil})\n`;
      out += `   Período: *${p.data_inicio}* a *${p.data_fim}*\n`;
      if (p.motivo) out += `   Motivo: _${p.motivo}_\n`;
      out += `   Estado: ⏳ *${p.estado}*\n\n`;
    });

    out += `📊 Total pendente: *${items.length} pedidos*`;
    if (isChefia) {
      out += `\n💡 _Podes aprovar ou rever estes pedidos no painel AppFrota Web._`;
    }
    return out;
  }

  formatPersonnelVacations(numero, items, nome = '') {
    const headerName = nome ? ` — ${nome}` : '';
    let out = `🏖️ *Histórico de Férias: Colaborador N.º ${numero}${headerName}*\n\n`;

    if (!items || items.length === 0) {
      out += `_Nenhum pedido de férias registado para o número de colaborador ${numero}._`;
      return out;
    }

    items.forEach((p, idx) => {
      const statusEmoji = p.estado === 'Aprovado' ? '✅' : p.estado === 'Rejeitado' ? '❌' : '⏳';
      out += `*${idx + 1}. ${p.data_inicio} a ${p.data_fim}* | ${statusEmoji} *${p.estado}*\n`;
      if (p.motivo) out += `   Motivo: _${p.motivo}_\n`;
      if (p.decidido_por) out += `   Decidido por: ${p.decidido_por} em ${p.decidido_em?.slice(0, 10) || ''}\n`;
      out += `\n`;
    });

    return out;
  }

  formatGeneralVacations(items) {
    let out = `🏖️ *Resumo Geral de Férias Registadas*\n\n`;
    if (!items || items.length === 0) {
      out += `_Sem pedidos de férias registados na base municipal._`;
      return out;
    }

    items.slice(0, 10).forEach((p, idx) => {
      const statusEmoji = p.estado === 'Aprovado' ? '✅' : p.estado === 'Rejeitado' ? '❌' : '⏳';
      out += `*${idx + 1}. ${p.nome_funcionario}* (${p.numero_funcionario})\n`;
      out += `   ${p.data_inicio} a ${p.data_fim} | ${statusEmoji} *${p.estado}*\n\n`;
    });

    out += `💡 _Usa \`/ferias pendentes\` ou \`/ferias [N_FUNCIONARIO]\` para filtrar._`;
    return out;
  }
}

export const vacationService = new VacationService();
export default vacationService;
