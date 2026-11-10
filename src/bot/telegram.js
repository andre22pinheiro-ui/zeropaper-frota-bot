// src/bot/telegram.js — Instanciação e Gestão de Eventos do Telegraf Bot (@zeropaperfrotaBot)
import { Telegraf } from 'telegraf';
import axios from 'axios';
import { registerCommands } from './commands.js';
import { handleCallbackQuery } from './callbacks.js';
import { dispatchMessage } from '../ai/dispatcher.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('TelegramBot');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!BOT_TOKEN) {
  log.error('TELEGRAM_BOT_TOKEN não configurado no .env!');
}

export const bot = new Telegraf(BOT_TOKEN);

/**
 * Transcrição de áudio Telegram via Groq Whisper (<400ms)
 */
async function transcribeVoice(ctx) {
  const fileId = ctx.message.voice?.file_id || ctx.message.audio?.file_id;
  if (!fileId || !GROQ_API_KEY) return null;

  try {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const downloadUrl = fileLink.href || String(fileLink);

    const audioResp = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 10000 });
    const buffer = Buffer.from(audioResp.data);

    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'audio/ogg' });
    formData.append('file', blob, 'audio.ogg');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'pt');
    formData.append('temperature', '0.0');

    const res = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      timeout: 10000
    });

    return res.data?.text?.trim() || null;
  } catch (err) {
    log.error('Erro na transcrição Whisper:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Análise visual de fotografia de avaria ou painel via Gemini Vision
 */
async function analyzePhoto(ctx) {
  const photos = ctx.message.photo;
  if (!photos || photos.length === 0 || !GEMINI_API_KEY) return null;

  const largest = photos[photos.length - 1];
  try {
    const fileLink = await ctx.telegram.getFileLink(largest.file_id);
    const downloadUrl = fileLink.href || String(fileLink);
    const res = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 10000 });
    const base64 = Buffer.from(res.data).toString('base64');

    const caption = ctx.message.caption || '';
    const prompt = caption 
      ? `Legenda do utilizador: "${caption}". Analisa esta imagem de componente automóvel, odómetro ou viatura e descreve o estado, anomalia, matrícula visível e quilometragem em português de Portugal.`
      : 'Analisa detalhadamente esta imagem de componente automóvel, odómetro ou viatura e descreve os danos, anomalias, matrícula visível e valores de odómetro em português de Portugal.';

    const payload = {
      contents: [{
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          { text: prompt }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
    };

    const gRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      payload,
      { timeout: 8000 }
    );

    return gRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    log.error('Erro ao analisar foto com Gemini Vision:', err.message);
    return null;
  }
}

// ─── Registro de Middlewares & Eventos ───────────────────────────────────────

bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  log.debug(`Ação processada em ${ms}ms [from: ${ctx.from?.id}]`);
});

// Registrar comandos oficiais
registerCommands(bot);

// Registrar callbacks de confirmação
bot.on('callback_query', handleCallbackQuery);

// Mensagens de Texto
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (!text || text.startsWith('/')) return; // Comandos já foram tratados

  try {
    await ctx.sendChatAction('typing');
    const result = await dispatchMessage(text, ctx);
    if (result && result.text) {
      await ctx.replyWithMarkdown(result.text, result.keyboard ? result.keyboard : undefined);
    }
  } catch (err) {
    log.error('Erro no processamento de texto:', err.message);
    await ctx.reply(`⚠️ Ocorreu um erro: ${err.message}`);
  }
});

// Mensagens de Voz / Áudio
bot.on(['voice', 'audio'], async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const transcription = await transcribeVoice(ctx);

    if (!transcription) {
      await ctx.reply('🎙️ Não foi possível reconhecer o áudio. Tenta falar mais perto do microfone ou envia por texto.');
      return;
    }

    await ctx.replyWithMarkdown(`🎙️ _"${transcription}"_`);
    await ctx.sendChatAction('typing');

    const result = await dispatchMessage(transcription, ctx);
    if (result && result.text) {
      await ctx.replyWithMarkdown(result.text, result.keyboard ? result.keyboard : undefined);
    }
  } catch (err) {
    log.error('Erro no processamento de voz:', err.message);
    await ctx.reply('⚠️ Ocorreu um erro ao processar o áudio.');
  }
});

// Fotografias (Avarias, Danos, Painel de Bordo)
bot.on('photo', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const analysis = await analyzePhoto(ctx);
    const caption = ctx.message.caption || '';

    const combinedText = caption 
      ? `${caption}. Análise visual: ${analysis || ''}`
      : (analysis || 'Fotografia de viatura');

    const result = await dispatchMessage(combinedText, ctx);
    if (result && result.text) {
      await ctx.replyWithMarkdown(result.text, result.keyboard ? result.keyboard : undefined);
    }
  } catch (err) {
    log.error('Erro ao processar fotografia:', err.message);
    await ctx.reply('⚠️ Ocorreu um erro ao analisar a fotografia.');
  }
});

bot.catch((err, ctx) => {
  log.error('Erro Telegraf não tratado:', err.message);
});

export default bot;
