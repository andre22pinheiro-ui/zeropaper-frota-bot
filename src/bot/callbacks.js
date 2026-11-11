// src/bot/callbacks.js — Tratamento de Confirmações e Cancelamentos Interativos (2 Passos)
import { Markup } from 'telegraf';
import { consumePendingAction, cancelPendingAction } from '../workflows/pendingActions.js';
import { identifyUser } from '../security/authorization.js';
import { fleetService, APP_BASE_URL } from '../services/fleetService.js';
import { routeService } from '../services/routeService.js';
import { fleetComplianceService } from '../services/fleetComplianceService.js';
import { buildShiftStartAnomalyAlert } from '../services/fleetProactiveService.js';
import { kmService } from '../services/kmService.js';
import { anomalyService } from '../services/anomalyService.js';
import { hygieneService } from '../services/hygieneService.js';
import { checklistService } from '../services/checklistService.js';
import { maintenanceService } from '../services/maintenanceService.js';
import { stockService } from '../services/stockService.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('BotCallbacks');
const ROTABUS_WEB_URL = process.env.ROTABUS_WEB_URL || 'https://smooth-bus-routes.vercel.app';
const ROTABUS_APK_URL = `${ROTABUS_WEB_URL}/rotabus.apk`;

const QUICK_FLEET_ACTIONS = {
  act_frota_status: async () => ({
    text: await fleetService.getFleetStatusReport(),
    extra: Markup.inlineKeyboard([
      [Markup.button.webApp('🚛 Abrir AppFrota Web', APP_BASE_URL)],
      [Markup.button.callback('🔄 Atualizar Estado', 'act_frota_status')]
    ])
  }),
  act_frotas: async () => ({
    text: await fleetService.getFleetStatusReport(),
    extra: Markup.inlineKeyboard([
      [Markup.button.webApp('🚛 Abrir AppFrota Web', APP_BASE_URL), Markup.button.webApp('🚌 RotaBus GPS', ROTABUS_WEB_URL)],
      [Markup.button.url('📲 Descarregar APK RotaBus', ROTABUS_APK_URL)]
    ])
  }),
  frota_porto_lisboa: async () => ({
    text: await routeService.handleRota('Porto para Lisboa')
  }),
  frota_amarante_porto: async () => ({
    text: await routeService.handleRota('Amarante para Porto')
  }),
  btn_tacho_45: async () => ({
    text: routeService.handleTacografo('4.5')
  }),
  btn_tacho_90: async () => ({
    text: routeService.handleTacografo('9')
  }),
  btn_fleet_tcc: async () => ({
    text: fleetComplianceService.formatModuloTcc()
  }),
  btn_fleet_gsr2: async () => ({
    text: fleetComplianceService.formatModuloGsr2()
  }),
  btn_fleet_leis: async () => ({
    text: fleetComplianceService.formatDreHeavyLinks()
  }),
  btn_shift_anomalies: async () => ({
    text:
      (await buildShiftStartAnomalyAlert()) ||
      '✅ *Abertura de Turno:* Sem anomalias abertas na frota neste momento.'
  })
};

export async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery?.data;
  const fromId = ctx.from?.id;

  if (!data || !fromId) return;

  if (Object.prototype.hasOwnProperty.call(QUICK_FLEET_ACTIONS, data)) {
    const user = await identifyUser(fromId, ctx.from?.first_name);
    if (!user) {
      await ctx.answerCbQuery('⛔ Utilizador não autorizado.').catch(() => {});
      return;
    }
    await ctx.answerCbQuery('A processar...').catch(() => {});
    const res = await QUICK_FLEET_ACTIONS[data]();
    await ctx.replyWithMarkdown(res.text, res.extra ? res.extra : undefined);
    return;
  }

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

