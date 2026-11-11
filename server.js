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
import { checkDatabaseHealth } from './src/database/supabase.js';
import { createLogger } from './src/utils/logger.js';

const REPURPOSED_RENDER_URL = 'https://telegram-master-bot-17bj.onrender.com';

const log = createLogger('Server');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Endpoint de Informação
app.get('/', (req, res) => {
  res.json({
    service: 'zeropaper-frota-bot',
    name: 'ZeroPaperFrota Dedicated Bot',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de Healthcheck rápido para Monitorização e Render (<5s readiness)
app.get('/health', async (req, res) => {
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
    status: dbHealth.ok ? 'healthy' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbHealth,
    bot: {
      username: 'zeropaperfrotaBot',
      id: 9280427698
    },
    timestamp: new Date().toISOString()
  });
});

// Endpoint oficial de Webhook Cloud-Native (/webhook/frota)
app.post('/webhook/frota', async (req, res) => {
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

    // 4. Keep-Alive HTTP Render (serviço dedicado telegram-master-bot-17bj.onrender.com) a cada 10 minutos
    if (process.env.RENDER || process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
      const keepAliveUrl = (process.env.RENDER_EXTERNAL_URL || REPURPOSED_RENDER_URL).replace(/\/$/, '');
      setInterval(() => {
        fetch(`${keepAliveUrl}/health`, { signal: AbortSignal.timeout(4000) }).catch(() => {});
      }, 10 * 60 * 1000).unref();
      log.info(`📡 Keep-Alive Render ativo: ${keepAliveUrl}/health a cada 10 min.`);
    }

    // 5. Iniciar Bot Telegraf (@zeropaperfrotaBot): setWebhook Cloud-Native com retry 429 (sem fallback Polling na nuvem)
    const renderUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_BASE_URL;
    const webhookUrl = renderUrl ? `${renderUrl.replace(/\/$/, '')}/webhook/frota` : null;
    await mountFleetWebhookTransport({
      botInstance: bot,
      webhookUrl,
      webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || ''
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

