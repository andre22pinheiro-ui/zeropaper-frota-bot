// server.js — Ponto de Entrada Principal do ZeroPaperFrota Bot Service
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import { bot } from './src/bot/telegram.js';
import { mountFleetWebhookTransport } from './src/services/fleetWebhookTransport.js';
import { startFleetProactiveMonitor, stopFleetProactiveMonitor } from './src/services/fleetProactiveService.js';
import { checkDatabaseHealth, getSupabaseMissingEnv } from './src/database/supabase.js';
import { createLogger } from './src/utils/logger.js';

const PRIMARY_RENDER_URL = 'https://zeropaper-frota-bot.onrender.com';

const log = createLogger('Server');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

function hasBotToken() {
  return Boolean(process.env.TELEGRAM_FROTAS_TOKEN || process.env.TELEGRAM_BOT_TOKEN);
}

function getMissingCriticalEnv() {
  const missing = [...getSupabaseMissingEnv()];
  if (!hasBotToken()) missing.push('TELEGRAM_FROTAS_TOKEN');
  return missing;
}

function getActiveRenderUrl() {
  return (process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_BASE_URL || PRIMARY_RENDER_URL).replace(/\/$/, '');
}

// Endpoint de Informação
app.get('/', (req, res) => {
  const missingEnv = getMissingCriticalEnv();
  res.json({
    service: 'zeropaper-frota-bot',
    name: 'ZeroPaperFrota Dedicated Bot',
    version: '1.0.0',
    status: missingEnv.length === 0 ? 'online' : 'misconfigured',
    activeUrl: getActiveRenderUrl(),
    primaryUrl: PRIMARY_RENDER_URL,
    missingEnv,
    timestamp: new Date().toISOString()
  });
});

// Endpoint de Healthcheck rápido para Monitorização e Render (<5s readiness)
app.get('/health', async (req, res) => {
  const missingEnv = getMissingCriticalEnv();
  let dbHealth;
  try {
    dbHealth = await Promise.race([
      checkDatabaseHealth(),
      new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: 'timeout_2500ms' }), 2500))
    ]);
  } catch (err) {
    dbHealth = { ok: false, error: err.message };
  }

  res.status(200).json({
    status: dbHealth.ok && missingEnv.length === 0 ? 'healthy' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    missingEnv,
    database: dbHealth,
    render: {
      activeUrl: getActiveRenderUrl(),
      primaryUrl: PRIMARY_RENDER_URL
    },
    bot: {
      username: 'zeropaperfrotaBot',
      id: 9280427698,
      tokenConfigured: hasBotToken()
    },
    timestamp: new Date().toISOString()
  });
});

// Endpoint oficial de Webhook Cloud-Native (/webhook/frota)
app.post('/webhook/frota', async (req, res) => {
  if (!hasBotToken()) {
    return res.status(503).json({ error: 'TELEGRAM_FROTAS_TOKEN not configured' });
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.get('x-telegram-bot-api-secret-token') !== secret) {
    return res.status(401).json({ error: 'Invalid webhook secret token' });
  }
  try {
    await bot.handleUpdate(req.body, res);
    if (!res.headersSent) {
      res.status(200).json({ ok: true });
    }
  } catch (err) {
    log.error('Erro ao processar /webhook/frota:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Webhook processing error' });
    }
  }
});

// Inicialização do Servidor e do Bot
async function start() {
  try {
    // 1. Abrir imediatamente porta HTTP em 0.0.0.0 para readiness do Render
    const server = app.listen(PORT, '0.0.0.0', () => {
      log.info(`🚀 Servidor HTTP ativo em 0.0.0.0:${PORT}`);
    });

    // 2. Tratamento de Encerramento Gracioso
    const gracefulShutdown = (signal) => {
      log.info(`Recebido ${signal}. A encerrar serviços graciosamente...`);
      stopFleetProactiveMonitor();
      try {
        bot.stop(signal);
      } catch {
        // Ignora caso o bot esteja em modo Webhook sem polling ativo
      }
      server.close(() => {
        log.info('Servidor HTTP encerrado. Processo terminado.');
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 2000).unref();
    };

    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 3. Verificar Supabase em background / pós-bind sem bloquear porta HTTP
    log.info('A verificar conectividade com o Supabase...');
    checkDatabaseHealth()
      .then((dbCheck) => {
        if (dbCheck.ok) {
          log.info(`✅ Supabase ligado com sucesso! Latência: ${dbCheck.latencyMs}ms | Viaturas ativas: ${dbCheck.countViaturas}`);
        } else {
          log.error('❌ Falha na conexão inicial ao Supabase:', dbCheck.error);
        }
      })
      .catch((err) => log.error('❌ Erro ao verificar Supabase:', err.message));

    // 4. Keep-Alive HTTP Render (serviço dedicado zeropaper-frota-bot.onrender.com) a cada 10 minutos
    if (process.env.RENDER || process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
      const keepAliveUrl = getActiveRenderUrl();
      setInterval(() => {
        fetch(`${keepAliveUrl}/health`, { signal: AbortSignal.timeout(4000) }).catch(() => {});
      }, 10 * 60 * 1000).unref();
      log.info(`📡 Keep-Alive Render ativo a cada 10 min: ${keepAliveUrl}/health`);
    }

    // 5. Iniciar Bot Telegraf (@zeropaperfrotaBot): setWebhook Cloud-Native com retry 429 (sem fallback Polling na nuvem)
    const renderUrl =
      process.env.RENDER_EXTERNAL_URL ||
      process.env.WEBHOOK_BASE_URL ||
      (process.env.RENDER || process.env.NODE_ENV === 'production' ? PRIMARY_RENDER_URL : null);
    const webhookUrl = renderUrl ? `${renderUrl.replace(/\/$/, '')}/webhook/frota` : null;
    await mountFleetWebhookTransport({
      botInstance: bot,
      webhookUrl,
      webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
      hasBotToken: hasBotToken()
    });

    if (process.env.NO_PROACTIVE_MONITOR !== 'true') {
      startFleetProactiveMonitor(bot);
    }
    log.info('🤖 ZeroPaperFrota Bot iniciado e pronto para receber mensagens!');

  } catch (err) {
    log.error('Erro crítico ao iniciar o serviço:', err.message);
    process.exit(1);
  }
}

start();

