// src/bot/commands.js — Comandos Oficiais de Barra (/) do ZeroPaperFrota Bot
import { fleetService, APP_BASE_URL } from '../services/fleetService.js';
import { stockService } from '../services/stockService.js';
import { identifyUser, authorizeUserByAdmin, listAuthorizedUsers } from '../security/authorization.js';
import { dispatchMessage } from '../ai/dispatcher.js';

export function registerCommands(bot) {
  // /start
  bot.command(['start', 'menu'], async (ctx) => {
    const fromId = ctx.from?.id;
    const fromName = ctx.from?.first_name || 'Colega';
    const user = await identifyUser(fromId, fromName);

    if (!user) {
      await ctx.replyWithMarkdown(
        `⛔ *Bem-vindo ao ZeroPaperFrota Bot*\n\n` +
        `O teu Telegram ID (\`${fromId}\`) ainda não se encontra autorizado.\n` +
        `Solicita à Chefia a ativação do teu acesso indicando o teu número de funcionário.`
      );
      return;
    }

    await ctx.replyWithMarkdown(
      `👋 *Olá, ${user.name}!*\n` +
      `Perfil Ativo: *${user.role}* (N.º ${user.numero})\n\n` +
      `Este é o bot operacional oficial do **AppFrota / ZeroPaperFrota**.\n` +
      `Podes enviar mensagens de texto ou **áudio de voz** diretamente ou utilizar os comandos:\n\n` +
      `• \`/frota\` — Estado geral e viaturas operacionais\n` +
      `• \`/viaturas\` — Lista detalhada de veículos\n` +
      `• \`/km\` — Instruções e registo de odómetro\n` +
      `• \`/avaria\` — Reportar anomalia ou avaria mecânica\n` +
      `• \`/lavagem\` — Registar higienização de viatura\n` +
      `• \`/vistoria\` — Realizar checklist diária\n` +
      `• \`/oficina\` — Serviços e intervenções\n` +
      `• \`/stock\` — Consulta de inventário de peças e óleo\n` +
      `• \`/ajuda\` — Guia completo de utilização\n\n` +
      `🌐 [Aceder ao AppFrota Web](${APP_BASE_URL})`
    );
  });

  // /help e /ajuda
  bot.command(['help', 'ajuda'], async (ctx) => {
    await ctx.replyWithMarkdown(
      `📋 *Guia Operacional ZeroPaperFrota*\n\n` +
      `*Exemplos de Envio Livre (Texto ou Voz):*\n` +
      `• _"Registar 155500 km no autocarro 39-HZ-66"_\n` +
      `• _"A carrinha 55-TN-89 acendeu a luz do motor e chiar nos travões"_\n` +
      `• _"Lavagem completa feita no autocarro 01-AA-01"_\n` +
      `• _"Fiz a vistoria de saída na 39-HZ-66 tudo ok"_\n` +
      `• _"Chegaram 10 filtros de óleo ao armazém"_\n\n` +
      `💡 *Garantia de Segurança:* Todas as alterações à base de dados mostram primeiro um resumo com botões para **Confirmar** ou **Cancelar**!`
    );
  });

  // /frota e /viaturas
  bot.command(['frota', 'viaturas'], async (ctx) => {
    await ctx.sendChatAction('typing');
    const report = await fleetService.getFleetStatusReport();
    await ctx.replyWithMarkdown(report);
  });

  // /stock
  bot.command('stock', async (ctx) => {
    const user = await identifyUser(ctx.from?.id, ctx.from?.first_name);
    if (!user) return ctx.reply('⛔ Utilizador não autorizado.');
    const summary = await stockService.getStockSummary(user);
    await ctx.replyWithMarkdown(summary);
  });

  // /km
  bot.command('km', async (ctx) => {
    const args = ctx.message.text.replace(/^\/km\s*/i, '').trim();
    if (!args) {
      await ctx.replyWithMarkdown(
        `🔢 *Registo de Quilometragem*\n\n` +
        `Usa o formato:\n\`/km [MATRÍCULA] [NOVO_KM] [OBSERVAÇÕES]\`\n\n` +
        `Ou envia em linguagem natural:\n_"Turno terminado na 39-HZ-66 com 155500 km"_`
      );
      return;
    }
    const res = await dispatchMessage(ctx.message.text, ctx);
    await ctx.replyWithMarkdown(res.text, res.keyboard ? res.keyboard : undefined);
  });

  // /avaria
  bot.command('avaria', async (ctx) => {
    const args = ctx.message.text.replace(/^\/avaria\s*/i, '').trim();
    if (!args) {
      await ctx.replyWithMarkdown(
        `🚨 *Reporte de Anomalia ou Avaria*\n\n` +
        `Usa o formato:\n\`/avaria [MATRÍCULA] [DESCRIÇÃO DO PROBLEMA]\`\n\n` +
        `Ou envia em linguagem natural / áudio:\n_"O autocarro 55-TN-89 está com a porta traseira encravada"_`
      );
      return;
    }
    const res = await dispatchMessage(ctx.message.text, ctx);
    await ctx.replyWithMarkdown(res.text, res.keyboard ? res.keyboard : undefined);
  });

  // /lavagem
  bot.command('lavagem', async (ctx) => {
    const args = ctx.message.text.replace(/^\/lavagem\s*/i, '').trim();
    if (!args) {
      await ctx.replyWithMarkdown(
        `🧼 *Registo de Higienização*\n\n` +
        `Exemplo:\n\`/lavagem 01-AA-01 Desinfeção e Lavagem Completa\`\n\n` +
        `Ou fala naturalmente:\n_"Carrinha 01-AA-01 limpa e aspirada"_`
      );
      return;
    }
    const res = await dispatchMessage(ctx.message.text, ctx);
    await ctx.replyWithMarkdown(res.text, res.keyboard ? res.keyboard : undefined);
  });

  // /vistoria
  bot.command('vistoria', async (ctx) => {
    const res = await dispatchMessage(ctx.message.text, ctx);
    await ctx.replyWithMarkdown(res.text, res.keyboard ? res.keyboard : undefined);
  });

  // /oficina
  bot.command('oficina', async (ctx) => {
    const res = await dispatchMessage(ctx.message.text, ctx);
    await ctx.replyWithMarkdown(res.text, res.keyboard ? res.keyboard : undefined);
  });

  // /autorizar (Admin only)
  bot.command('autorizar', async (ctx) => {
    const fromId = ctx.from?.id;
    const text = ctx.message.text.replace(/^\/autorizar\s*/i, '').trim();
    const parts = text.split(/\s+/);

    if (parts.length < 2) {
      await ctx.replyWithMarkdown(
        `🔐 *Autorização de Utilizador (Chefia)*\n\n` +
        `Formato:\n\`/autorizar [TELEGRAM_ID] [NUMERO_FUNCIONARIO] [PERFIL]\`\n\n` +
        `Exemplo:\n\`/autorizar 123456789 01 Motorista\``
      );
      return;
    }

    const [targetId, numFunc, role] = parts;
    try {
      const reg = await authorizeUserByAdmin(fromId, targetId, numFunc, role || 'Motorista');
      await ctx.replyWithMarkdown(`✅ *Utilizador Autorizado com Sucesso:*\n• Nome: *${reg.name}*\n• ID: \`${targetId}\`\n• Perfil: *${reg.role}* (N.º ${reg.numero})`);
    } catch (err) {
      await ctx.replyWithMarkdown(`❌ *Erro na Autorização:* ${err.message}`);
    }
  });
}

export default {
  registerCommands
};

