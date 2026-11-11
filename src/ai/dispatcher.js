// src/ai/dispatcher.js — Despachante Cognitivo com Validação de Segurança e Confirmação em 2 Passos
import { classifyIntent } from './intentClassifier.js';
import { identifyUser } from '../security/authorization.js';
import { buildConfirmationPrompt } from '../workflows/confirmation.js';
import { generateKey, isAlreadyProcessed, recordExecution, getPreviousResult } from '../workflows/idempotency.js';
import { fleetService } from '../services/fleetService.js';
import { kmService } from '../services/kmService.js';
import { anomalyService } from '../services/anomalyService.js';
import { hygieneService } from '../services/hygieneService.js';
import { checklistService } from '../services/checklistService.js';
import { maintenanceService } from '../services/maintenanceService.js';
import { stockService } from '../services/stockService.js';
import { routeService } from '../services/routeService.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Dispatcher');

/**
 * Ponto de entrada universal para qualquer instrução (texto ou voz transcrita)
 */
export async function dispatchMessage(text, ctx) {
  const fromId = ctx.from?.id;
  const fromName = ctx.from?.first_name || 'Utilizador';

  // 1. Identificação Estrita de Segurança
  const user = await identifyUser(fromId, fromName);
  if (!user) {
    return {
      text: `⛔ *Acesso Não Autorizado*\n\nO teu utilizador do Telegram (ID: \`${fromId}\`) não se encontra associado à equipa operacional do ZeroPaperFrota.\n\nPor favor, contacta a Chefia ou Administrador para autorizar o teu acesso.`,
      keyboard: null
    };
  }

  // 2. Verificação de Idempotência
  const idempotencyKey = generateKey(fromId, 'MESSAGE', { text: text.trim() });
  if (isAlreadyProcessed(idempotencyKey)) {
    log.info(`Mensagem duplicada ignorada pela chave de idempotência: ${idempotencyKey.slice(0, 10)}`);
    const prev = getPreviousResult(idempotencyKey);
    return {
      text: prev?.text || '⚠️ Esta mensagem já foi recebida e processada anteriormente.',
      keyboard: null
    };
  }

  // 3. Classificação Semântica
  const classified = await classifyIntent(text);
  log.info(`Intenção classificada: ${classified.intent}`, {
    from: `${user.name} (${user.role})`,
    matricula: classified.matricula
  });

  // ─── OPERAÇÕES DE LEITURA (Execução Direta) ───────────────────────────────

  if (classified.intent === 'fleet_status') {
    const report = await fleetService.getFleetStatusReport();
    recordExecution(idempotencyKey, { text: report });
    return { text: report, keyboard: null };
  }

  if (classified.intent === 'stock_query') {
    const summary = await stockService.getStockSummary(user);
    recordExecution(idempotencyKey, { text: summary });
    return { text: summary, keyboard: null };
  }

  if (classified.intent === 'route_calculate') {
    const routeArgs = classified.origem && classified.destino
      ? `${classified.origem} para ${classified.destino}`
      : text;
    const out = await routeService.handleRota(routeArgs);
    recordExecution(idempotencyKey, { text: out });
    return { text: out, keyboard: null };
  }

  if (classified.intent === 'tacografo_audit') {
    const tachoOut = routeService.handleTacografo(classified.horas_conducao ?? '');
    recordExecution(idempotencyKey, { text: tachoOut });
    return { text: tachoOut, keyboard: null };
  }

  if (classified.intent === 'vehicle_lookup' && classified.matricula) {
    const details = await fleetService.getVehicleDetails(classified.matricula);
    const v = details.viatura;
    let resp = 
      `🚗 *Ficha Técnica da Viatura:*\n` +
      `• Matrícula: **${v.matricula}**\n` +
      `• Modelo: **${v.marca_modelo || v.tipo || 'Viatura'}**\n` +
      `• Odómetro Atual: **${(v.quilometragem || 0).toLocaleString('pt-PT')} km**\n` +
      `• Estado Operacional: _${v.status || 'disponível'}_\n` +
      `• Próxima Inspeção: ${v.proxima_inspecao || 'Em dia'}\n`;

    if (details.anomaliasPendentes.length > 0) {
      resp += `\n⚠️ *Avarias Pendentes:* ${details.anomaliasPendentes.length} ocorrência(s)\n`;
      for (const a of details.anomaliasPendentes) {
        resp += `• [${a.prioridade}] ${a.descricao}\n`;
      }
    } else {
      resp += `\n✅ *Sem anomalias ativas registadas.*`;
    }

    recordExecution(idempotencyKey, { text: resp });
    return { text: resp, keyboard: null };
  }

  // ─── OPERAÇÕES DE ESCRITA (Exigem Confirmação em 2 Passos) ────────────────

  if (classified.intent === 'km_register') {
    if (!classified.matricula || !classified.km) {
      return {
        text: `⚠️ *Dados Incompletos para Quilometragem*\n\nIndica a matrícula e o odómetro atual.\nExemplo: _"Registar 155500 km na viatura 39-HZ-66"_`,
        keyboard: null
      };
    }

    const { payload, preview } = await kmService.prepareKmRegistration(
      user,
      classified.matricula,
      classified.km,
      classified.descricao
    );

    const prompt = buildConfirmationPrompt(user.telegramId, 'KM_REGISTER', preview, payload);
    return prompt;
  }

  if (classified.intent === 'anomaly_report') {
    if (!classified.descricao || classified.descricao.length < 3) {
      return {
        text: `⚠️ *Descrição de Anomalia em Falta*\n\nIndica qual é o problema ou avaria detetada.\nExemplo: _"O autocarro 55-TN-89 acendeu a luz do óleo"_`,
        keyboard: null
      };
    }

    const { payload, preview } = await anomalyService.prepareAnomalyReport(
      user,
      classified.matricula,
      classified.descricao,
      classified.prioridade,
      classified.imobiliza
    );

    const prompt = buildConfirmationPrompt(user.telegramId, 'ANOMALY_REPORT', preview, payload);
    return prompt;
  }

  if (classified.intent === 'hygiene_register') {
    if (!classified.matricula) {
      return {
        text: `⚠️ *Viatura Não Especificada*\n\nIndica qual a viatura que foi limpa ou desinfetada.\nExemplo: _"Carrinha 01-AA-01 lavada e desinfetada"_`,
        keyboard: null
      };
    }

    const { payload, preview } = await hygieneService.prepareHygiene(
      user,
      classified.matricula,
      classified.tipo_limpeza,
      classified.descricao
    );

    const prompt = buildConfirmationPrompt(user.telegramId, 'HYGIENE_REGISTER', preview, payload);
    return prompt;
  }

  if (classified.intent === 'checklist_register') {
    if (!classified.matricula) {
      return {
        text: `⚠️ *Viatura Não Especificada*\n\nIndica a viatura para registar o checklist diário.\nExemplo: _"Checklist da 39-HZ-66 tudo ok"_`,
        keyboard: null
      };
    }

    const { payload, preview } = await checklistService.prepareChecklist(
      user,
      classified.matricula,
      classified.descricao
    );

    const prompt = buildConfirmationPrompt(user.telegramId, 'CHECKLIST_REGISTER', preview, payload);
    return prompt;
  }

  if (classified.intent === 'maintenance_register') {
    if (!classified.matricula || !classified.descricao) {
      return {
        text: `⚠️ *Dados Incompletos de Manutenção*\n\nIndica a viatura e a intervenção efetuada.\nExemplo: _"Troca de óleo na 12-XE-34 custo 180 euros"_`,
        keyboard: null
      };
    }

    const { payload, preview } = await maintenanceService.prepareMaintenance(
      user,
      classified.matricula,
      classified.descricao,
      classified.custo
    );

    const prompt = buildConfirmationPrompt(user.telegramId, 'MAINTENANCE_REGISTER', preview, payload);
    return prompt;
  }

  if (classified.intent === 'stock_movement') {
    if (!classified.item_stock || !classified.quantidade_stock) {
      return {
        text: `⚠️ *Dados Incompletos de Stock*\n\nIndica o artigo e a quantidade a movimentar.\nExemplo: _"Chegaram 10 filtros de óleo ao armazém"_`,
        keyboard: null
      };
    }

    const { payload, preview } = await stockService.prepareStockMovement(
      user,
      classified.item_stock,
      classified.quantidade_stock,
      classified.operacao_stock || 'adicionar'
    );

    const prompt = buildConfirmationPrompt(user.telegramId, 'STOCK_MOVEMENT', preview, payload);
    return prompt;
  }

  // ─── AJUDA E COMANDOS OPERACIONAIS ───────────────────────────────────────
  return {
    text: 
      `🚛 *ZeroPaperFrota — Bot Operacional Dedicado*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Podes falar ou escrever em linguagem natural que eu preparo a operação para confirmação:\n\n` +
      `• *Quilometragem:* "Registar 155500 km na 39-HZ-66"\n` +
      `• *Avarias / Danos:* "A 55-TN-89 tem fuga de óleo urgente"\n` +
      `• *Higienização:* "Autocarro 01-AA-01 lavado e desinfetado"\n` +
      `• *Vistoria:* "Checklist da 39-HZ-66 tudo ok"\n` +
      `• *Oficina:* "Mudança de pastilhas na 12-XE-34 custo 120€"\n` +
      `• *Stock:* "Chegaram 10 filtros de óleo" ou \`/stock\`\n` +
      `• *Rotas Pesados:* \`/rota Porto para Lisboa\`\n` +
      `• *Tacógrafo CE 561:* \`/tacografo 8.5\`\n` +
      `• *Estado:* \`/frota\` — Resumo de todas as viaturas e alertas\n\n` +
      `🔒 _Operador Ativo: ${user.name} (${user.role})_`,
    keyboard: null
  };
}

export default {
  dispatchMessage
};

