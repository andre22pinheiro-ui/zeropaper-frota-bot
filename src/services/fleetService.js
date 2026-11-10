// src/services/fleetService.js — Lógica de Negócio para Consulta e Gestão de Viaturas
import { fleetRepository } from '../database/repositories/fleetRepository.js';
import { anomalyRepository } from '../database/repositories/anomalyRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { validateAndFormatPlate } from '../security/validation.js';

export const APP_BASE_URL = process.env.APP_BASE_URL || 'https://appfrota-ten.vercel.app';

export class FleetService {
  async getAllVehicles() {
    return await fleetRepository.getAll();
  }

  async findVehicle(query) {
    if (!query) return null;
    const list = await this.getAllVehicles();

    // 1. Tentar validação de matrícula formatada
    try {
      const formatted = validateAndFormatPlate(query);
      const found = list.find(v => v.matricula.toUpperCase() === formatted);
      if (found) return found;
    } catch {}

    const qClean = String(query).toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 2. Match parcial de matrícula
    for (const v of list) {
      const vClean = v.matricula.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (vClean.includes(qClean) || qClean.includes(vClean)) return v;
    }

    // 3. Match por modelo ou tipo
    const qLower = String(query).toLowerCase();
    for (const v of list) {
      const model = (v.marca_modelo || '').toLowerCase();
      const tipo = (v.tipo || '').toLowerCase();
      if (model.includes(qLower) || (tipo && tipo.includes(qLower))) return v;
    }

    return null;
  }

  async getVehicleDetails(matriculaOrQuery) {
    const v = await this.findVehicle(matriculaOrQuery);
    if (!v) {
      throw new NotFoundError(`Viatura "${matriculaOrQuery}" não encontrada na frota.`);
    }

    const anomalias = await anomalyRepository.getByMatricula(v.matricula);
    const pendentes = anomalias.filter(a => !a.resolvido);

    return {
      viatura: v,
      anomaliasPendentes: pendentes
    };
  }

  async getFleetStatusReport() {
    const viaturas = await this.getAllVehicles();
    const pendentes = await anomalyRepository.getPending(15);

    let texto = `🚛 *ZeroPaperFrota — Estado Geral da Frota:*\n`;
    texto += `Plataforma Web: [appfrota-ten.vercel.app](${APP_BASE_URL})\n\n`;

    let disp = 0;
    let serv = 0;
    let oficina = 0;

    for (const v of viaturas) {
      const statusIcon = v.status === 'em_servico' ? '🟢' : v.status === 'manutencao' ? '🔴' : '🟡';
      if (v.status === 'em_servico') serv++;
      else if (v.status === 'manutencao') oficina++;
      else disp++;

      const cleanStatus = v.status === 'em_servico' ? 'em serviço' : v.status === 'manutencao' ? 'em oficina / manutenção' : (v.status || 'disponível');

      texto += `${statusIcon} *${v.matricula}* — ${v.marca_modelo || v.tipo || 'Viatura'}\n`;
      texto += `   • Odómetro: **${(v.quilometragem || 0).toLocaleString('pt-PT')} km**\n`;
      texto += `   • Estado: _${cleanStatus}_\n`;
      if (v.proxima_inspecao) texto += `   • Inspeção Periódica: ${v.proxima_inspecao}\n`;
    }

    texto += `\n📊 *Resumo Global:*\n`;
    texto += `• Total: **${viaturas.length} viaturas**\n`;
    texto += `• Em Serviço: **${serv}** | Disponíveis: **${disp}** | Oficina: **${oficina}**\n`;

    if (pendentes.length > 0) {
      texto += `\n⚠️ *Avarias Pendentes na Oficina (${pendentes.length}):*\n`;
      for (const a of pendentes) {
        const imob = a.imobiliza ? '⛔ *IMOBILIZADA*' : '🟡';
        const cleanDesc = (a.descricao || '').replace(/[_*`]/g, ' ');
        texto += `• ${imob} ${a.matricula || 'Geral'}: ${cleanDesc} (${a.prioridade || 'Média'})\n`;
      }
    }

    return texto;
  }
}

export const fleetService = new FleetService();
export default fleetService;

