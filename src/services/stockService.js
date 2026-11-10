// src/services/stockService.js — Gestão e Movimentação de Stock com Rastreabilidade
import { stockRepository } from '../database/repositories/stockRepository.js';
import { enforcePermission } from '../security/permissions.js';
import { validateStockQuantity } from '../security/validation.js';
import { NotFoundError } from '../utils/errors.js';

export const APP_BASE_URL = process.env.APP_BASE_URL || 'https://appfrota-ten.vercel.app';

export class StockService {
  async getStockSummary(user) {
    enforcePermission(user, 'view_stock', 'consultar stock');
    const items = await stockRepository.getAll();

    if (!items || items.length === 0) {
      return '📦 *Stock de Peças & Oficinas:* Nenhum artigo registado no sistema.';
    }

    let texto = `📦 *ZeroPaperFrota — Inventário de Stock:*\n\n`;
    for (const item of items) {
      const isLow = (item.quantidade || 0) <= (item.minimo || 5);
      const icon = isLow ? '⚠️' : '✅';
      texto += `${icon} *${item.item}*\n`;
      texto += `   • Existências: **${item.quantidade} ${item.unidade || 'un.'}** (Mínimo: ${item.minimo})\n`;
      if (item.categoria) texto += `   • Categoria: _${item.categoria}_\n`;
    }

    texto += `\n🌐 [Gerir Stock no AppFrota Web](${APP_BASE_URL}/frota)`;
    return texto;
  }

  async prepareStockMovement(user, itemQuery, quantidade, operacao = 'adicionar') {
    enforcePermission(user, 'manage_stock', 'movimentar artigos de stock');

    const matched = await stockRepository.findByName(itemQuery);
    if (!matched) {
      throw new NotFoundError(`Artigo de stock correspondente a "${itemQuery}" não encontrado.`);
    }

    const currentQty = matched.quantidade || 0;
    const validatedQty = validateStockQuantity(quantidade, operacao, currentQty);

    const newQty = operacao === 'consumir' ? currentQty - validatedQty : currentQty + validatedQty;

    const payload = {
      stockId: matched.id,
      itemNome: matched.item,
      quantidadeMovimento: validatedQty,
      quantidadeAnterior: currentQty,
      quantidadeNova: newQty,
      operacao,
      funcionarioNome: user.name,
      funcionarioNum: user.numero
    };

    const opLabel = operacao === 'consumir' ? 'Saída de Stock (Consumo)' : 'Entrada em Stock';
    const preview = 
      `📦 Artigo: *${payload.itemNome}*\n` +
      `🔄 Tipo de Movimento: **${opLabel}**\n` +
      `🔢 Quantidade a Movimentar: **${payload.quantidadeMovimento} un.**\n` +
      `📊 Saldo Previsto: **${payload.quantidadeNova} un.** (anterior: ${payload.quantidadeAnterior} un.)\n` +
      `👤 Registado por: *${payload.funcionarioNome}* (N.º ${payload.funcionarioNum})\n`;

    return { payload, preview };
  }

  async executeStockMovement(payload) {
    const updated = await stockRepository.updateQuantity(payload.stockId, payload.quantidadeNova);

    const opBadge = payload.operacao === 'consumir' ? '🔻 Saída Efetuada' : '🔺 Entrada Registada';
    return (
      `📦 *[ZeroPaperFrota] Movimento de Stock Concluído!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 Artigo: **${payload.itemNome}**\n` +
      `🔄 Operação: *${opBadge}*\n` +
      `📊 Quantidade Atualizada: **${payload.quantidadeNova} un.** (anterior: ${payload.quantidadeAnterior} un.)\n` +
      `👤 Operador: *${payload.funcionarioNome}*\n` +
      `📅 Data: ${new Date().toLocaleDateString('pt-PT')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 [Ver Inventário no AppFrota](${APP_BASE_URL}/frota)`
    );
  }
}

export const stockService = new StockService();
export default stockService;
