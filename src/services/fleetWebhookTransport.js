// src/services/fleetWebhookTransport.js — Transporte Webhook Cloud-Native com Reutilização e Backoff 429
import { createLogger } from '../utils/logger.js';

const log = createLogger('FleetWebhookTransport');
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Configura transporte Webhook (com getMe, getWebhookInfo, retry 429 e proteção anti-polling na nuvem)
 * ou Polling apenas em desenvolvimento local explícito.
 */
export async function mountFleetWebhookTransport({
  botInstance,
  webhookUrl,
  webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '',
  usePolling = process.env.USE_POLLING === 'true',
  isCloudEnv = Boolean(process.env.RENDER || process.env.NODE_ENV === 'production'),
  sleepFn = defaultSleep
}) {
  if (webhookUrl && !usePolling) {
    if (!botInstance.botInfo && typeof botInstance.telegram?.getMe === 'function') {
      try {
        botInstance.botInfo = await botInstance.telegram.getMe();
      } catch (err) {
        log.warn(`Aviso getMe (@zeropaperfrotaBot): ${err?.message || err}`);
      }
    }

    try {
      if (typeof botInstance.telegram?.getWebhookInfo === 'function') {
        const info = await botInstance.telegram.getWebhookInfo().catch(() => null);
        if (info?.url === webhookUrl) {
          log.info(`✅ Webhook ZeroPaperFrota já ativo: ${webhookUrl}`);
          return { mode: 'webhook', reused: true, webhookUrl };
        }
      }
    } catch {
      // Continua para registo explícito
    }

    const webhookOpts = { allowed_updates: ['message', 'callback_query'] };
    if (webhookSecret) {
      webhookOpts.secret_token = webhookSecret;
    }

    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await botInstance.telegram.setWebhook(webhookUrl, webhookOpts);
        log.info(`✅ Webhook único ZeroPaperFrota registado: ${webhookUrl}`);
        return { mode: 'webhook', reused: false, webhookUrl, attempts: attempt };
      } catch (err) {
        lastErr = err;
        const retryAfterSec = Number(err?.response?.parameters?.retry_after || 0);
        const waitMs = Math.min(Math.max(retryAfterSec || attempt, 1), 10) * 1000;
        log.warn(`Tentativa ${attempt}/3 setWebhook ZeroPaperFrota falhou: ${err?.message || err}`);
        if (attempt < 3) await sleepFn(waitMs);
      }
    }

    log.error(
      `Webhook /webhook/frota mantido na rota HTTP sem fallback destrutivo para polling: ${lastErr?.message || lastErr}`
    );
    return { mode: 'webhook', error: lastErr?.message || String(lastErr), webhookUrl };
  }

  if (isCloudEnv && !usePolling) {
    log.warn('Ambiente cloud sem webhookUrl configurada — polling bloqueado para evitar conflito 409.');
    return { mode: 'idle' };
  }

  log.info('A iniciar Telegraf Bot (@zeropaperfrotaBot) em Polling local...');
  await botInstance.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
  botInstance.launch({ allowedUpdates: ['message', 'callback_query'] }).catch((err) => {
    log.error('Erro polling:', err?.message || err);
  });
  return { mode: 'polling' };
}

export default {
  mountFleetWebhookTransport
};
