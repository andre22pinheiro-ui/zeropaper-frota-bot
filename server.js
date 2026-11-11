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
import { checkDatabaseHealth } from './src/database/supabase.js';
import { createLogger } from './src/utils/logger.js';

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

// Endpoint de Healthcheck para Monitorização e Render
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.ok;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbHealth,
    bot: {
      username: 'zeropaperfrotaBot',
      id: 9280427698
    },
    timestamp: new Date().toISOString()
  });
});

// Inicialização do Servidor e do Bot
async function start() {
  try {
    log.info('A verificar conectividade com o Supabase...');
    const dbCheck = await checkDatabaseHealth();
    if (dbCheck.ok) {
      log.info(`✅ Supabase ligado com sucesso! Latência: ${dbCheck.latencyMs}ms | Viaturas ativas: ${dbCheck.countViaturas}`);
    } else {
      log.error('❌ Falha na conexão inicial ao Supabase:', dbCheck.error);
    }

    // Iniciar Servidor HTTP
    const server = app.listen(PORT, () => {
      log.info(`🚀 Servidor HTTP ativo na porta ${PORT}`);
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

    // Keep-Alive HTTP Render a cada 10 minutos
    if (process.env.RENDER || process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
      const keepAliveUrl = (process.env.RENDER_EXTERNAL_URL || 'https://zeropaper-frota-bot.onrender.com').replace(/\/$/, '');
      setInterval(() => {
        fetch(`${keepAliveUrl}/health`).catch(() => {});
      }, 10 * 60 * 1000).unref();
      log.info(`📡 Keep-Alive Render ativo: ${keepAliveUrl}/health a cada 10 min.`);
    }

    // Iniciar Bot Telegraf (@zeropaperfrotaBot): Webhook em Cloud / Polling em Dev Local
    const renderUrl = process.env.RENDER_EXTERNAL_URL || process.env.WEBHOOK_BASE_URL;
    if (renderUrl && process.env.USE_POLLING !== 'true') {
      const webhookUrl = `${renderUrl.replace(/\/$/, '')}/webhook/frota`;
      try {
        const webhookOpts = { allowed_updates: ['message', 'callback_query'] };
        if (process.env.TELEGRAM_WEBHOOK_SECRET) {
          webhookOpts.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
        }
        await bot.telegram.setWebhook(webhookUrl, webhookOpts);
        log.info(`✅ Webhook único ZeroPaperFrota registado: ${webhookUrl}`);
      } catch (err) {
        log.warn(`Falha ao configurar webhook /webhook/frota, fallback polling: ${err.message}`);
        await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
        await bot.launch({ allowedUpdates: ['message', 'callback_query'] });
      }
    } else {
      log.info('A iniciar Telegraf Bot (@zeropaperfrotaBot) em Polling local...');
      await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
      await bot.launch({ allowedUpdates: ['message', 'callback_query'] });
    }
    log.info('🤖 ZeroPaperFrota Bot iniciado e pronto para receber mensagens!');

    // Tratamento de Encerramento Gracioso
    const gracefulShutdown = (signal) => {
      log.info(`Recebido ${signal}. A encerrar serviços graciosamente...`);
      try {
        bot.stop(signal);
      } catch {
        // Ignora caso o bot esteja em modo Webhook sem polling ativo
      }
      server.close(() => {
        log.info('Servidor HTTP encerrado. Processo terminado.');
        process.exit(0);
      });
    };

    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (err) {
    log.error('Erro crítico ao iniciar o serviço:', err.message);
    process.exit(1);
  }
}

start();

