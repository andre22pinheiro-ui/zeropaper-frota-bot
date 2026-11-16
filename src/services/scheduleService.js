// src/services/scheduleService.js — Gestão de Escalas de Serviço e Assistente Cognitivo
// Transplantado e harmonizado a partir de appfrota-main/lib/schedule-assistant.ts e schedule-routes.ts
import { scheduleRepository } from '../database/repositories/scheduleRepository.js';

const weekdayPattern =
  'segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo';
const datePattern = '\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}';

const weekdayNumbers = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6
};

const weekdayNames = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$|^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;

  const year = Number(match[1] ?? match[6]);
  const month = Number(match[2] ?? match[5]);
  const day = Number(match[3] ?? match[4]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function normalizeWeekday(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-feira$/, '');
}

export function parseScheduleInstruction(instruction, referenceDate = new Date()) {
  const text = String(instruction || '').trim();
  if (!text) return null;

  const explicitDate = text.match(new RegExp(`\\b(${datePattern})\\b`, 'i'));
  const weekday = text.match(new RegExp(`\\b(${weekdayPattern})\\b`, 'i'));
  let targetDate = null;

  if (explicitDate) {
    targetDate = parseDate(explicitDate[1]);
  } else if (/hoje/i.test(text)) {
    targetDate = new Date(referenceDate);
  } else if (/amanh[aã]/i.test(text)) {
    targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (weekday) {
    const targetDay = weekdayNumbers[normalizeWeekday(weekday[1])];
    if (targetDay !== undefined) {
      targetDate = new Date(referenceDate);
      for (let offset = 0; offset < 7 && targetDate.getDay() !== targetDay; offset += 1) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }
  }

  return targetDate ? toDateString(targetDate) : null;
}

export function orderScheduleRoutes(routes) {
  const ordered = (routes || [])
    .map((route, index) => ({ route, index }))
    .sort(
      (left, right) =>
        String(left.route.data ?? '').localeCompare(String(right.route.data ?? '')) ||
        (left.route.ordem_servico ?? left.index + 1) - (right.route.ordem_servico ?? right.index + 1) ||
        left.index - right.index
    );
  const nextNumberByDate = new Map();

  return ordered.map(({ route }) => {
    const date = String(route.data ?? '');
    const number = (nextNumberByDate.get(date) ?? 0) + 1;
    nextNumberByDate.set(date, number);
    return { ...route, ordem_servico: number };
  });
}

export class ScheduleService {
  async getDailyScheduleReport(queryDateOrText) {
    const today = new Date();
    let targetDate = parseScheduleInstruction(queryDateOrText, today);

    if (!targetDate && queryDateOrText && !/^\d{4}-\d{2}-\d{2}$/.test(queryDateOrText)) {
      // Tentar pesquisa por motorista
      const byDriver = await scheduleRepository.getByDriver(queryDateOrText);
      if (byDriver && byDriver.length > 0) {
        return this.formatDriverSchedule(queryDateOrText, byDriver);
      }
    }

    if (!targetDate) {
      targetDate = toDateString(today);
    }

    const items = await scheduleRepository.getByDate(targetDate);
    return this.formatDateSchedule(targetDate, items);
  }

  formatDateSchedule(dateStr, items) {
    const d = parseDate(dateStr) || new Date();
    const dayName = weekdayNames[d.getDay()] || '';

    let out = `📅 *Escala de Serviço — ${dayName}, ${dateStr}*\n\n`;

    if (!items || items.length === 0) {
      out += `_Sem serviços escalados para esta data na base municipal._\n\n`;
      out += `💡 *Dica:* Podes consultar outra data (ex: \`/escala amanhã\` ou \`/escala 2026-11-17\`).`;
      return out;
    }

    const ordered = orderScheduleRoutes(items);
    ordered.forEach((s, idx) => {
      const turno = s.turno || 'Geral';
      const mot = s.motorista || 'A designar';
      const viat = s.matricula ? ` | Viatura: *${s.matricula}*` : '';
      const desc = s.descricao ? `\n   ↳ _${s.descricao}_` : '';
      out += `*${idx + 1}. Turno ${turno}*\n`;
      out += `   Condutor: *${mot}*${viat}${desc}\n\n`;
    });

    out += `📊 Total de circuitos escalados: *${items.length}*`;
    return out;
  }

  formatDriverSchedule(driverName, items) {
    let out = `👤 *Escala de Serviço — Condutor: ${driverName}*\n\n`;
    items.forEach((s, idx) => {
      out += `*${idx + 1}. Data: ${s.data}* (Turno: ${s.turno || 'Geral'})\n`;
      if (s.matricula) out += `   Viatura: *${s.matricula}*\n`;
      if (s.descricao) out += `   Serviço: _${s.descricao}_\n`;
      out += `\n`;
    });
    out += `📊 Total de registos encontrados: *${items.length}*`;
    return out;
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;
