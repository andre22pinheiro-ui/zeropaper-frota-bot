// src/services/fleetAlertsService.js — Auditoria e Notificação de Alertas da Frota e Documentos
// Transplantado e harmonizado a partir de appfrota-main/components/vehicle-alerts.tsx e personal-document-alerts.tsx
import { alertsRepository } from '../database/repositories/alertsRepository.js';

function diasAte(dateStr) {
  if (!dateStr) return 9999;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dateStr}T00:00:00`);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86400000);
}

export class FleetAlertsService {
  async getOperationalAlertsReport() {
    const [vehicles, personalDocs, systemAlerts] = await Promise.all([
      alertsRepository.getVehicleAlertData().catch(() => []),
      alertsRepository.getPersonnelDocumentAlerts().catch(() => []),
      alertsRepository.getSystemAlerts(5).catch(() => [])
    ]);

    const critical = [];
    const upcoming = [];
    const docs = [];

    // 1. Processar Alertas de Viaturas (Revisões e Inspeções)
    for (const v of vehicles) {
      // Revisão por Km
      if (v.proxima_revisao_km != null && v.quilometragem != null) {
        const kmRestantes = v.proxima_revisao_km - v.quilometragem;
        if (kmRestantes <= 0) {
          critical.push(`🚨 *${v.matricula}*: Revisão ULTRAPASSADA em *${Math.abs(kmRestantes)} km*! (${v.quilometragem} / ${v.proxima_revisao_km} km)`);
        } else if (kmRestantes <= 1000) {
          upcoming.push(`⚠️ *${v.matricula}*: Próxima revisão a *${kmRestantes} km* (${v.quilometragem} / ${v.proxima_revisao_km} km)`);
        }
      }

      // Inspeções periódicas
      const inspecoes = [
        ['Normal', v.proxima_inspecao],
        ['Passageiros', v.proxima_inspecao_passageiros],
        ['Crianças (TCC)', v.proxima_inspecao_criancas]
      ];

      for (const [tipo, dataInsp] of inspecoes) {
        if (dataInsp) {
          const dias = diasAte(dataInsp);
          if (dias < 0) {
            critical.push(`🚨 *${v.matricula}*: Inspeção ${tipo} EXPIRADA há *${Math.abs(dias)} dias* (${dataInsp})!`);
          } else if (dias <= 30) {
            upcoming.push(`⚠️ *${v.matricula}*: Inspeção ${tipo} expira em *${dias} dias* (${dataInsp})`);
          }
        }
      }
    }

    // 2. Processar Alertas de Documentos de Pessoal (Cartas, CAM, Tacógrafo)
    for (const doc of personalDocs) {
      if (doc.data_validade) {
        const dias = diasAte(doc.data_validade);
        const colab = doc.nome || (doc.numero ? `Colaborador N.º ${doc.numero}` : 'Colaborador');
        const tipoDoc = doc.tipo || 'Documento';

        if (dias < 0) {
          critical.push(`🚨 *${colab}*: ${tipoDoc} CADUCADO há *${Math.abs(dias)} dias* (${doc.data_validade})!`);
        } else if (dias <= 30) {
          upcoming.push(`⚠️ *${colab}*: ${tipoDoc} caduca em *${dias} dias* (${doc.data_validade})`);
        } else if (dias <= 90) {
          docs.push(`ℹ️ *${colab}*: ${tipoDoc} válido até ${doc.data_validade} (${dias} dias)`);
        }
      }
    }

    // 3. Montar Relatório Telegram Markdown
    let out = `🛡️ *ZeroPaperFrota — Painel de Alertas Operacionais*\n\n`;

    if (critical.length > 0) {
      out += `*🚨 ALERTAS CRÍTICOS / URGENTES (${critical.length}):*\n`;
      critical.forEach(item => { out += `• ${item}\n`; });
      out += `\n`;
    }

    if (upcoming.length > 0) {
      out += `*⚠️ PRÓXIMAS INTERVENÇÕES / VALIDADES A 30 DIAS (${upcoming.length}):*\n`;
      upcoming.forEach(item => { out += `• ${item}\n`; });
      out += `\n`;
    }

    if (docs.length > 0) {
      out += `*📋 VALIDADES DE DOCUMENTOS ACOMPANHADAS (${docs.length}):*\n`;
      docs.forEach(item => { out += `• ${item}\n`; });
      out += `\n`;
    }

    if (critical.length === 0 && upcoming.length === 0 && docs.length === 0) {
      out += `✅ *Nenhum alerta crítico pendente!*\n`;
      out += `Todas as viaturas e documentos dos motoristas encontram-se dentro da validade legal regulamentar.`;
    } else {
      out += `💡 _Consulta detalhada e agendamento de inspeções disponível no AppFrota Web._`;
    }

    return out;
  }
}

export const fleetAlertsService = new FleetAlertsService();
export default fleetAlertsService;
