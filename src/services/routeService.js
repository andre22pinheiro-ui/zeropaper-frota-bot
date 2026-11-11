// src/services/routeService.js — Roteamento Pesados (ORS driving-hgv) & Auditoria Tacógrafo CE 561/2006
import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const log = createLogger('RouteService');

const ROTABUS_URL = process.env.ROTABUS_WEB_URL || 'https://smooth-bus-routes.vercel.app';
const ROTABUS_APK_URL = `${ROTABUS_URL}/rotabus.apk`;

function getOrsKey() {
  return process.env.ORS_API_KEY || process.env.OPENROUTESERVICE_API_KEY || '';
}

export function buildRotaBusUrl(origem, destino) {
  return `${ROTABUS_URL}/?origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}`;
}

async function geocode(place) {
  const orsKey = getOrsKey();
  if (!orsKey) return null;
  try {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(place)}&boundary.country=PT&size=1`;
    const res = await axios.get(url, { timeout: 6000 });
    const coords = res.data?.features?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    return { lon: coords[0], lat: coords[1] };
  } catch (err) {
    log.warn(`Geocode falhou para "${place}": ${err.message}`);
    return null;
  }
}

export async function calcularRota(origem, destino, perfil = 'driving-hgv') {
  const rotabusUrl = buildRotaBusUrl(origem, destino);
  const orsKey = getOrsKey();

  if (!orsKey) {
    return {
      km: '~ (ver RotaBus)',
      duracao: 'Navegação direta GPS no RotaBus',
      origem,
      destino,
      rotabusUrl
    };
  }

  const [coordOrigem, coordDestino] = await Promise.all([geocode(origem), geocode(destino)]);
  if (!coordOrigem || !coordDestino) {
    return {
      km: '~',
      duracao: 'Navegação direta no RotaBus',
      origem,
      destino,
      rotabusUrl
    };
  }

  try {
    const url = `https://api.openrouteservice.org/v2/directions/${perfil}`;
    const res = await axios.post(
      url,
      {
        coordinates: [[coordOrigem.lon, coordOrigem.lat], [coordDestino.lon, coordDestino.lat]],
        preference: 'recommended',
        instructions: false
      },
      {
        headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
        timeout: 7000
      }
    );

    const summary = res.data?.routes?.[0]?.summary;
    if (!summary) {
      return { error: 'Resposta inválida do OpenRouteService', origem, destino, rotabusUrl };
    }

    const km = (summary.distance / 1000).toFixed(1);
    const horas = Math.floor(summary.duration / 3600);
    const mins = Math.floor((summary.duration % 3600) / 60);
    const duracao = horas > 0 ? `${horas}h ${mins}min` : `${mins} min`;

    return { km, duracao, origem, destino, rotabusUrl };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    return { error: `ORS: ${msg}`, origem, destino, rotabusUrl };
  }
}

export function calcularTacografo(horasConducao) {
  const h = parseFloat(String(horasConducao).replace(',', '.'));
  if (Number.isNaN(h) || h <= 0) return null;

  const pausasNecessarias = Math.floor(h / 4.5);
  const tempoPausaMin = pausasNecessarias * 45;
  const tempoTotalMin = h * 60 + tempoPausaMin;
  const hTotal = Math.floor(tempoTotalMin / 60);
  const mTotal = Math.round(tempoTotalMin % 60);

  let legal = '✅ *Dentro do limite diário legal (máx. 9h00 — Reg. CE 561/2006 & UE 165/2014)*';
  const mod45 = parseFloat((h % 4.5).toFixed(4));
  if (h >= 4.0 && h < 4.5) {
    const minsLeft = Math.max(1, Math.round((4.5 - h) * 60));
    legal = `⏳ *Dentro do limite diário legal — AVISO PROATIVO: faltam ${minsLeft} min para atingir 4h30 de condução contínua (CE 561/2006 | DL 169/2009 | Lei 27/2010)*`;
  } else if (mod45 >= 4.0 && mod45 < 4.5 && h <= 9) {
    const minsLeft = Math.max(1, Math.round((4.5 - mod45) * 60));
    legal = `⏳ *Dentro do limite diário legal — AVISO PROATIVO: faltam ${minsLeft} min para a próxima pausa obrigatória de 45m (CE 561/2006)*`;
  }
  if (h > 9 && h <= 10) {
    legal = '⚠️ *Extensão diária de 10h (permitida no máx. 2x por semana — Reg. CE 561/2006 | Máx. 56h/semana e 90h/quinzena)*';
  } else if (h > 10) {
    legal = '⛔ *INFRAÇÃO GRAVE (DL 169/2009 & Lei 27/2010): Excede o limite legal diário absoluto de 10h!*';
  }

  const restanteNum = h % 4.5 === 0 ? 0 : parseFloat((4.5 - (h % 4.5)).toFixed(1));

  return {
    horasConducao: h,
    pausasObrigatorias: pausasNecessarias,
    tempoPausaMin,
    tempoTotalViagem: `${hTotal}h ${mTotal}min`,
    tempoRestanteAtePausa: restanteNum > 0 ? `${restanteNum}h` : '0h (PAUSA OBRIGATÓRIA DE 45m)',
    legal
  };
}

export async function handleRota(args = '') {
  const trimmed = String(args || '').trim();
  if (!trimmed || !/\s+para\s+/i.test(trimmed)) {
    return (
      `🗺️ *Calcular Rota de Pesados & Autocarros (driving-hgv)*\n\n` +
      `Formato:\n\`/rota ORIGEM para DESTINO\`\n\n` +
      `Exemplos:\n• \`/rota Porto para Lisboa\`\n• \`/rota Amarante para Braga\``
    );
  }

  const [origem, destino] = trimmed.split(/\s+para\s+/i).map((s) => s.trim());
  if (!origem || !destino) return '❌ Formato inválido. Usa: `/rota Porto para Lisboa`';

  const res = await calcularRota(origem, destino, 'driving-hgv');
  if (res.error && !res.rotabusUrl) return `❌ Erro ao calcular rota: ${res.error}`;

  let texto = `🚛 *Rota de Pesados / Autocarro (driving-hgv):*\n\n`;
  texto += `📍 Origem: *${origem}*\n`;
  texto += `📍 Destino: *${destino}*\n`;
  if (res.km && res.km !== '~') texto += `📏 Distância: **${res.km} km**\n`;
  if (res.duracao) texto += `⏱️ Duração estimada: **${res.duracao}**\n`;
  if (res.error) texto += `⚠️ _Nota ORS:_ ${res.error}\n`;
  texto += `🛡️ *Algoritmo Anti-Sinuosidade:* Autoestradas prioritárias.\n\n`;
  texto += `🌐 [Abrir rota interativa no RotaBus](${res.rotabusUrl})\n`;
  texto += `📲 [Descarregar APK Android](${ROTABUS_APK_URL})`;

  return texto;
}

export function handleTacografo(args = '') {
  const horasStr = String(args || '').trim();
  if (!horasStr) {
    return (
      `📋 *Auditor de Tacógrafo Digital (Regulamento CE 561/2006)*\n\n` +
      `Formato:\n\`/tacografo HORAS_CONDUÇÃO\`\n\n` +
      `Exemplos:\n• \`/tacografo 4.5\` — Fim do primeiro bloco\n• \`/tacografo 8.5\` — Turno padrão\n• \`/tacografo 9.5\` — Extensão excecional`
    );
  }

  const res = calcularTacografo(horasStr);
  if (!res) return '❌ Valor inválido. Usa um número de horas, ex: `/tacografo 8.5`';

  return (
    `📋 *Relatório de Tacógrafo Digital (CE 561/2006 & UE 165/2014):*\n\n` +
    `⏱️ Horas de condução registadas: **${res.horasConducao}h**\n` +
    `🛑 Pausas obrigatórias (45 min): **${res.pausasObrigatorias}**\n` +
    `⏳ Tempo total de paragem: **${res.tempoPausaMin} min**\n` +
    `🏁 Tempo total decorrido: **${res.tempoTotalViagem}**\n` +
    `🚦 Condução restante antes da próxima pausa: **${res.tempoRestanteAtePausa}**\n\n` +
    `${res.legal}\n\n` +
    `_Enquadramento Legal PT/UE: Reg. (CE) 561/2006 e (UE) 165/2014 | Código da Estrada (DL 114/94), DL 169/2009 e Lei 27/2010. Pausa de 45m pode ser fracionada em 15m seguidos de 30m (nunca ao contrário); máximo 56h/semana e 90h/quinzena._`
  );
}

export const routeService = {
  calcularRota,
  calcularTacografo,
  handleRota,
  handleTacografo,
  buildRotaBusUrl
};

export default routeService;
