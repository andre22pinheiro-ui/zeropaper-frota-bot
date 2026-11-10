// src/bot/callbacks.js — Tratamento de Confirmações e Cancelamentos Interativos (2 Passos)
import { consumePendingAction, cancelPendingAction } from '../workflows/pendingActions.js';
import { kmService } from '../services/kmService.js';
import { anomalyService } from '../services/anomalyService.js';
import { hygieneService } from '../services/hygieneService.js';
import { checklistService } from '../services/checklistService.js';
import { maintenanceService } from '../services/maintenanceService.js';
import { stockService } from '../services/stockService.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('BotCallbacks');

export async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery?.data;
  const fromId = ctx.from?.id;

  if (!data || !fromId) return;

  // 1. Confirmação
  if (data.startsWith('confirm_')) {
    const actionId = data.replace('confirm_', '');
    await ctx.answerCbQuery('A processar e gravar no Supabase...');

    const pending = consumePendingAction(actionId, fromId);
    if (!pending) {
      await ctx.editMessageText(
        '⚠️ *Operação Expirada ou Já Executada*\n\nEsta proposta já foi concluída, cancelada ou expirou o limite de 5 minutos.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      let resultText = '';

      if (pending.operation === 'KM_REGISTER') {
        resultText = await kmService.executeKmRegistration(pending.payload);
      } else if (pending.operation === 'ANOMALY_REPORT') {
        resultText = await anomalyService.executeAnomalyReport(pending.payload);
      } else if (pending.operation === 'HYGIENE_REGISTER') {
        resultText = await hygieneService.executeHygiene(pending.payload);
      } else if (pending.operation === 'CHECKLIST_REGISTER') {
        resultText = await checklistService.executeChecklist(pending.payload);
      } else if (pending.operation === 'MAINTENANCE_REGISTER') {
        resultText = await maintenanceService.executeMaintenance(pending.payload);
      } else if (pending.operation === 'STOCK_MOVEMENT') {
        resultText = await stockService.executeStockMovement(pending.payload);
      } else {
        resultText = '❌ Operação desconhecida.';
      }

      await ctx.editMessageText(resultText, { parse_mode: 'Markdown' });
    } catch (err) {
      log.error(`Erro ao executar ação confirmada [${pending.operation}]:`, err.message);
      await ctx.editMessageText(`❌ *Erro na Gravação:* ${err.message}`, { parse_mode: 'Markdown' });
    }
    return;
  }

  // 2. Cancelamento
  if (data.startsWith('cancel_')) {
    const actionId = data.replace('cancel_', '');
    await ctx.answerCbQuery('Operação cancelada.');
    const cancelled = cancelPendingAction(actionId, fromId);

    if (cancelled) {
      await ctx.editMessageText(
        '🚫 *Operação Cancelada*\n\nNenhum dado foi alterado na base de dados.',
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.editMessageText(
        '⚠️ Ação já expirada ou inexistente.',
        { parse_mode: 'Markdown' }
      );
    }
    return;
  }
}

export default {
  handleCallbackQuery
};
