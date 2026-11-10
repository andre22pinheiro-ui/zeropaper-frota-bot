// src/security/validation.js — Validações de Domínio Estritas e Anti-Erro
import { ValidationError } from '../utils/errors.js';

// Regex para matrículas portuguesas:
// Formatos clássicos e recentes: 00-AA-00, AA-00-00, 00-00-AA, AA-00-AA
const PT_PLATE_REGEX = /\b([0-9]{2}[- ][A-Z]{2}[- ][0-9]{2}|[A-Z]{2}[- ][0-9]{2}[- ][A-Z]{2}|[0-9]{2}[- ][0-9]{2}[- ][A-Z]{2}|[A-Z]{2}[- ][0-9]{2}[- ][0-9]{2})\b/i;

/**
 * Normaliza e valida matrícula portuguesa
 */
export function validateAndFormatPlate(rawPlate) {
  if (!rawPlate || typeof rawPlate !== 'string') {
    throw new ValidationError('Matrícula ausente ou em formato inválido.');
  }

  const clean = rawPlate.trim().toUpperCase().replace(/\s+/g, '-');
  const match = clean.match(PT_PLATE_REGEX);

  if (!match) {
    // Permite formato simples sem hífens ex: 39HZ66 -> 39-HZ-66
    const alphanumeric = clean.replace(/[^A-Z0-9]/g, '');
    if (alphanumeric.length === 6) {
      const p1 = alphanumeric.slice(0, 2);
      const p2 = alphanumeric.slice(2, 4);
      const p3 = alphanumeric.slice(4, 6);
      return `${p1}-${p2}-${p3}`;
    }
    throw new ValidationError(`Formato de matrícula inválido: "${rawPlate}". Usa o formato XX-XX-XX.`);
  }

  return match[1].replace(' ', '-').toUpperCase();
}

/**
 * Validação rigorosa de quilometragem e odómetro (Secção 9.2)
 */
export function validateOdometer(novoKm, kmAnterior = 0) {
  const km = parseInt(novoKm, 10);
  if (isNaN(km) || km < 0) {
    throw new ValidationError(`Quilometragem inválida: "${novoKm}". O odómetro deve ser um número inteiro positivo.`);
  }

  const anterior = parseInt(kmAnterior, 10) || 0;

  // Regra Fundamental: Odómetro não pode recuar
  if (km < anterior) {
    throw new ValidationError(
      `⛔ INCONSISTÊNCIA DE ODÓMETRO: O valor introduzido (${km.toLocaleString('pt-PT')} km) ` +
      `é inferior ao último registo da viatura (${anterior.toLocaleString('pt-PT')} km). ` +
      `A gravação automática foi bloqueada por segurança.`
    );
  }

  const diferenca = km - anterior;
  const isAnomalous = diferenca > 1000; // Deslocação superior a 1000 km num único turno requer alerta

  return {
    valid: true,
    novoKm: km,
    kmAnterior: anterior,
    diferenca,
    isAnomalous
  };
}

/**
 * Deteta termos críticos de segurança em anomalias (travões, direção, fumo, suspensão)
 */
export function analyzeSafetyRisk(descricao) {
  if (!descricao) return { isSafetyCritical: false, terms: [] };
  const dLower = String(descricao).toLowerCase();

  const criticalTerms = [
    'travão', 'travao', 'travoes', 'travões', 'pastilhas', 'óleo travão',
    'direção', 'direcao', 'volante', 'fumo', 'fogo', 'incêndio',
    'fuga de gasóleo', 'fuga combustível', 'pneu furado', 'pneu rebentado',
    'sem travões', 'não trava', 'reboque', 'imobilizada'
  ];

  const matched = criticalTerms.filter(t => dLower.includes(t));
  return {
    isSafetyCritical: matched.length > 0,
    terms: matched
  };
}

/**
 * Valida quantidades numéricas de stock
 */
export function validateStockQuantity(quantity, operation = 'adicionar', currentStock = 0) {
  const q = parseInt(quantity, 10);
  if (isNaN(q) || q <= 0) {
    throw new ValidationError(`Quantidade inválida: "${quantity}". Deve ser um número inteiro maior que zero.`);
  }

  if (operation === 'consumir') {
    if (currentStock - q < 0) {
      throw new ValidationError(
        `STOCK INSUFICIENTE: Stock atual é ${currentStock} un. Tentativa de retirar ${q} un. ` +
        `Quantidades negativas são estritamente proibidas.`
      );
    }
  }

  return q;
}

export default {
  validateAndFormatPlate,
  validateOdometer,
  analyzeSafetyRisk,
  validateStockQuantity
};

