// src/ai/intentClassifier.js — Classificação Semântica Estrita e Extração de Entidades (Temperatura 0.0)
import 'dotenv/config';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const log = createLogger('IntentClassifier');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const INTENT_SYSTEM_PROMPT = `És o Extrator Semântico e Classificador de Intenções do ZeroPaperFrota Bot.
A tua função é interpretar mensagens de utilizadores (motoristas, mecânicos, gestores) e devolver EXCLUSIVAMENTE um objeto JSON válido (sem código markdown envolvente).

INTENÇÕES SUPORTADAS:
- "fleet_status": Pedido de resumo geral ou estado da frota (ex: "como está a frota?", "resumo das viaturas", "/frota").
- "vehicle_lookup": Pedido de informação sobre uma viatura específica (ex: "dados da 39-HZ-66", "quantos km tem o Volvo?").
- "km_register": Registo de quilómetros, fim de turno, odómetro (ex: "regista 155500 km na 39-HZ-66", "acabei o serviço com 89400 km na 12-XE-34").
- "anomaly_report": Reporte de avaria, luz de aviso, ruído mecânico, pneu, acidente (ex: "a 55-TN-89 está a chiar nos travões", "luz de óleo acesa").
- "hygiene_register": Lavagem, desinfeção, limpeza de viatura (ex: "autocarro 01-AA-01 lavado e desinfetado").
- "checklist_register": Vistoria ou checklist de saída/entrada (ex: "fiz a vistoria da 39-HZ-66 tudo ok").
- "maintenance_register": Mudança de peças, revisão de oficina, despesas (ex: "mudei calços de travão na 39-HZ-66 custo 150 euros").
- "stock_query": Consulta de existências de peças, óleos ou filtros (ex: "quanto óleo temos?", "ver stock de filtros").
- "stock_movement": Entrada ou consumo de stock (ex: "chegaram 10 filtros de óleo", "gastei 5 litros de óleo 15W40").
- "help": Pedido de ajuda, comandos ou funcionamento (ex: "ajuda", "como funciona?", "/help").

SCHEMA JSON OBRIGATÓRIO:
{
  "intent": "fleet_status" | "vehicle_lookup" | "km_register" | "anomaly_report" | "hygiene_register" | "checklist_register" | "maintenance_register" | "stock_query" | "stock_movement" | "help",
  "matricula": string | null,
  "km": number | null,
  "descricao": string,
  "prioridade": "Baixa" | "Média" | "Alta" | "Urgente" | null,
  "imobiliza": boolean | null,
  "custo": number | null,
  "tipo_limpeza": string | null,
  "item_stock": string | null,
  "quantidade_stock": number | null,
  "operacao_stock": "adicionar" | "consumir" | null,
  "confidence": number
}`;

/**
 * Classifica a intenção com IA com fallback determinístico
 */
export async function classifyIntent(text) {
  if (!text || typeof text !== 'string') {
    return { intent: 'help', descricao: '', confidence: 1.0 };
  }

  const raw = text.trim();

  // 1. Tentar Gemini Flash Lite
  if (GEMINI_API_KEY) {
    const models = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
    for (const m of models) {
      try {
        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{ parts: [{ text: raw }] }],
            system_instruction: { parts: [{ text: INTENT_SYSTEM_PROMPT }] },
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.0
            }
          },
          { timeout: 5000 }
        );

        const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed && parsed.intent) return parsed;
        }
      } catch (err) {
        log.warn(`Gemini [${m}] falhou no classifier:`, err.message);
      }
    }
  }

  // 2. Fallback Groq LPU
  if (GROQ_API_KEY) {
    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: INTENT_SYSTEM_PROMPT },
            { role: 'user', content: raw }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.0
        },
        {
          headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
          timeout: 5000
        }
      );

      const content = res.data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && parsed.intent) return parsed;
      }
    } catch (err) {
      log.warn('Groq falhou no classifier:', err.message);
    }
  }

  // 3. Heurística Determinística de Backup
  return fallbackHeuristic(raw);
}

function fallbackHeuristic(text) {
  const t = text.toLowerCase();
  const plateMatch = text.match(/\b([0-9]{2}[- ][A-Z]{2}[- ][0-9]{2}|[A-Z]{2}[- ][0-9]{2}[- ][A-Z]{2})\b/i);
  const matricula = plateMatch ? plateMatch[1].replace(' ', '-').toUpperCase() : null;

  if (/\b(frota|viaturas|resumo|veiculos)\b/i.test(t)) {
    return { intent: 'fleet_status', matricula: null, descricao: text, confidence: 0.9 };
  }

  const kmMatch = text.match(/(\d{4,6})\s*km/i);
  if (kmMatch) {
    return {
      intent: 'km_register',
      matricula,
      km: parseInt(kmMatch[1], 10),
      descricao: text,
      confidence: 0.9
    };
  }

  if (/\b(avaria|estragad|partid|luz.*painel|chiar|travoes|fuga|ruido)\b/i.test(t)) {
    return {
      intent: 'anomaly_report',
      matricula,
      descricao: text,
      prioridade: t.includes('urgente') ? 'Urgente' : 'Média',
      imobiliza: /\b(imobilizada|parada|reboque)\b/i.test(t),
      confidence: 0.9
    };
  }

  if (/\b(lavagem|lavar|desinfe[cç][aã]o|higieniza)\b/i.test(t)) {
    return {
      intent: 'hygiene_register',
      matricula,
      descricao: text,
      tipo_limpeza: 'Lavagem e Desinfeção Completa',
      confidence: 0.85
    };
  }

  if (/\b(stock|oleo|filtros)\b/i.test(t)) {
    return {
      intent: 'stock_query',
      item_stock: 'óleo',
      descricao: text,
      confidence: 0.8
    };
  }

  return { intent: 'help', descricao: text, confidence: 0.5 };
}

export default {
  classifyIntent
};
