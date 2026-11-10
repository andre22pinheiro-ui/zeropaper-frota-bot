// src/workflows/confirmation.js — Renderização de Teclados e Mensagens de Confirmação Interativa
import { Markup } from 'telegraf';
import { createPendingAction } from './pendingActions.js';

/**
 * Cria a mensagem estruturada de proposta e o teclado inline [Confirmar] / [Cancelar]
 */
export function buildConfirmationPrompt(userId, operation, previewText, payload) {
  const pending = createPendingAction(userId, operation, payload);

  const messageText = 
    `⚠️ *Confirmação de Operação Obrigatória*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${previewText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Revê os dados acima. Esta ação irá gravar diretamente no AppFrota._\n` +
    `_Expira em 5 minutos._`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Confirmar Registo', `confirm_${pending.id}`),
      Markup.button.callback('❌ Cancelar', `cancel_${pending.id}`)
    ]
  ]);

  return {
    text: messageText,
    keyboard,
    actionId: pending.id
  };
}

export default {
  buildConfirmationPrompt
};

