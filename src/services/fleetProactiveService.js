// src/services/fleetProactiveService.js — Proatividade Em Turno & Alertas Tacógrafo CE 561/2006 / UE 165/2014
import { createLogger } from '../utils/logger.js';
import { anomalyRepository } from '../database/repositories/anomalyRepository.js';

const log = createLogger('FleetProactive');

const CONTINUOUS_LIMIT_MINUTES = 270; // 4h30 Reg. (CE) 561/2006
const LEGAL_REF = 'CE 561/2006 · UE 165/2014 · DL 114/94 · DL 169/2009 · Lei 27/2010';

let monitorInterval = null;
let lastShiftStartDay = null;
let lastShiftEndDay = null;

function getLisbonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24;
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const dayKey = date.toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' });
  return { hour, minute, dayKey };
}

/**
 * Avalia condução contínua e dispara avisos proativos aos 30 min e 15 min antes das 4h30 (270 min).
 */
export function evaluateDrivingLimitAlert(drivenMinutes) {
  const mins = Number(drivenMinutes);
  if (!Number.isFinite(mins) || mins < 0) return null;

  const remaining = Math.round(CONTINUOUS_LIMIT_MINUTES - mins);

  if (remaining <= 0) {
    return {
      level: 'critical',
      remainingMinutes: 0,
      legalRef: LEGAL_REF,
      message:
        `⛔ *PARAGEM OBRIGATÓRIA DE TACÓGRAFO (4h30 Atingidas)*\n` +
        `Cumpre pausa imediata de **45 min** (ou fracionada em **15m + 30m**, nunca ao contrário).\n` +
        `⚖️ _${LEGAL_REF} (Máx. 9h/dia ou 10h 2x/sem; 56h/semana; 90h/quinzena)._`
    };
  }

  if (remaining <= 15) {
    return {
      level: 'urgent_15m',
      remainingMinutes: remaining,
      legalRef: LEGAL_REF,
      message:
        `🚨 *ALERTA TACÓGRAFO — FALTAM ${remaining} MIN PARA AS 4h30!*\n` +
        `Procura área de serviço segura (A4/EN15/EN210) para iniciar pausa obrigatória de **45 min** (ou **15m + 30m**).\n` +
        `⚖️ _${LEGAL_REF}._`
    };
  }

  if (remaining <= 30) {
    return {
      level: 'warning_30m',
      remainingMinutes: remaining,
      legalRef: LEGAL_REF,
      message:
        `⏳ *AVISO PROATIVO TACÓGRAFO — FALTAM ${remaining} MIN PARA AS 4h30*\n` +
        `Planeia a paragem legal nos próximos **${remaining} min** para evitar infração.\n` +
        `⚖️ _${LEGAL_REF}._`
    };
  }

  return null;
}

/**
 * Gera alerta de anomalias abertas no arranque de turno a partir dos registos reais em Supabase.
 */
export async function buildShiftStartAnomalyAlert({
  getPendingFn = () => anomalyRepository.getPending(10)
} = {}) {
  try {
    const pending = (await getPendingFn()) || [];
    if (!Array.isArray(pending) || pending.length === 0) {
      return null;
    }

    const lines = pending.slice(0, 8).map((a) => {
      const flag = a.imobiliza ? '⛔ *IMOBILIZADA*' : '🟡 Aberta';
      const desc = String(a.descricao || 'Sem descrição').replace(/[_*`]/g, ' ');
      return `• ${flag} **${a.matricula || 'Geral'}**: ${desc} _(${a.prioridade || 'Média'})_`;
    });

    return (
      `🚛 *ABERTURA DE TURNO — ANOMALIAS ABERTAS NA FROTA (${pending.length})*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${lines.join('\n')}\n\n` +
      `✅ Confirma checklist pré-viagem e estado da viatura antes de arrancar. _(${LEGAL_REF})_`
    );
  } catch (err) {
    log.warn('Falha ao consultar anomalias pendentes no arranque de turno:', err.message);
    return null;
  }
}

/**
 * Gera lembrete de fecho de turno (registo de KM, higiene/lavagem e repouso legal).
 */
export function buildShiftEndReminder() {
  return (
    `🌙 *FECHO DE TURNO ZEROPAPERFROTA*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `1️⃣ Regista o **odómetro final (KM)** da viatura;\n` +
    `2️⃣ Confirma o estado de **Higiene / Lavagem** interior e exterior;\n` +
    `3️⃣ Garante cumprimento do **repouso diário legal** (Reg. CE 561/2006 & UE 165/2014 | DL 169/2009 & Lei 27/2010 — máx. 56h/semana e 90h/quinzena).`
  );
}

async function sendAlertSafe(botInstance, chatId, text) {
  if (!botInstance?.telegram || !chatId || !text) return false;
  try {
    await botInstance.telegram.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    return true;
  } catch {
    try {
      await botInstance.telegram.sendMessage(chatId, text.replace(/[*_`]/g, ''), {
        disable_web_page_preview: true
      });
      return true;
    } catch (err) {
      log.warn(`Falha envio proativo frota para ${chatId}: ${err.message}`);
      return false;
    }
  }
}

export function stopFleetProactiveMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export function startFleetProactiveMonitor(
  botInstance,
  {
    notifyChatId = process.env.CHAT_ID_AUTORIZADO ||
      process.env.AUTHORIZED_CHAT_ID ||
      process.env.TELEGRAM_ADMIN_ID ||
      '',
    getPendingFn = () => anomalyRepository.getPending(10)
  } = {}
) {
  if (!botInstance) return null;
  stopFleetProactiveMonitor();

  monitorInterval = setInterval(async () => {
    if (!notifyChatId) return;
    const { hour, minute, dayKey } = getLisbonParts();

    // 07:30 Europe/Lisbon — Abertura de turno + anomalias em aberto
    if (hour === 7 && minute === 30 && lastShiftStartDay !== dayKey) {
      lastShiftStartDay = dayKey;
      const alertText = await buildShiftStartAnomalyAlert({ getPendingFn });
      if (alertText) {
        await sendAlertSafe(botInstance, notifyChatId, alertText);
      }
    }

    // 19:30 Europe/Lisbon — Lembrete de fecho de turno (KM + Higiene + Tacógrafo)
    if (hour === 19 && minute === 30 && lastShiftEndDay !== dayKey) {
      lastShiftEndDay = dayKey;
      await sendAlertSafe(botInstance, notifyChatId, buildShiftEndReminder());
    }
  }, 60 * 1000);

  if (typeof monitorInterval.unref === 'function') {
    monitorInterval.unref();
  }

  log.info('🚛 Monitor Proativo ZeroPaperFrota ativo (turno 07:30/19:30 Europe/Lisbon + alertas CE 561/2006).');
  return { stop: stopFleetProactiveMonitor };
}

export default {
  evaluateDrivingLimitAlert,
  buildShiftStartAnomalyAlert,
  buildShiftEndReminder,
  startFleetProactiveMonitor,
  stopFleetProactiveMonitor
};
