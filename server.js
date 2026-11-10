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

    // Iniciar Bot Telegraf (Long Polling)
    log.info('A iniciar Telegraf Bot (@zeropaperfrotaBot)...');
    await bot.launch();
    log.info('🤖 ZeroPaperFrota Bot iniciado e pronto para receber mensagens!');

    // Tratamento de Encerramento Gracioso
    const gracefulShutdown = (signal) => {
      log.info(`Recebido ${signal}. A encerrar serviços graciosamente...`);
      bot.stop(signal);
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

