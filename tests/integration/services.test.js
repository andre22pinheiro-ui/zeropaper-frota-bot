// tests/integration/services.test.js — Testes de Integração com Serviços e Supabase
import test from 'node:test';
import assert from 'node:assert/strict';
import { fleetService } from '../../src/services/fleetService.js';
import { kmService } from '../../src/services/kmService.js';
import { anomalyService } from '../../src/services/anomalyService.js';
import { stockService } from '../../src/services/stockService.js';

const mockAdmin = {
  name: 'André Rafael Macedo Pinheiro',
  numero: '1688',
  role: 'Chefia',
  telegramId: '950415577'
};

test('FleetService: Consulta de Viaturas e Resumo da Frota', async () => {
  const viaturas = await fleetService.getAllVehicles();
  assert.ok(Array.isArray(viaturas));
  assert.ok(viaturas.length >= 5);

  const volvo = await fleetService.findVehicle('39-HZ-66');
  assert.ok(volvo);
  assert.equal(volvo.matricula, '39-HZ-66');

  const report = await fleetService.getFleetStatusReport();
  assert.ok(report.includes('ZeroPaperFrota — Estado Geral da Frota'));
  assert.ok(report.includes('39-HZ-66'));
});

test('KmService: Preparação e Validação de Proposta de Odómetro', async () => {
  const volvo = await fleetService.findVehicle('39-HZ-66');
  const targetKm = (volvo.quilometragem || 155000) + 50;

  const { payload, preview } = await kmService.prepareKmRegistration(
    mockAdmin,
    '39-HZ-66',
    targetKm,
    'Teste automatizado de integração'
  );

  assert.equal(payload.matricula, '39-HZ-66');
  assert.equal(payload.kmFim, targetKm);
  assert.equal(payload.total, 50);
  assert.ok(preview.includes('39-HZ-66'));
  assert.ok(preview.includes('+50 km'));
});

test('AnomalyService: Preparação de Alerta de Segurança', async () => {
  const { payload, preview } = await anomalyService.prepareAnomalyReport(
    mockAdmin,
    '55-TN-89',
    'Pastilhas de travão a chiar com risco',
    'Média',
    false
  );

  assert.equal(payload.isSafetyCritical, true);
  assert.equal(payload.prioridade, 'Urgente');
  assert.equal(payload.imobiliza, true);
  assert.ok(preview.includes('ALERTA DE SEGURANÇA'));
});

test('StockService: Inventário de Peças', async () => {
  const summary = await stockService.getStockSummary(mockAdmin);
  assert.ok(summary.includes('Inventário de Stock'));
  assert.ok(summary.includes('Óleo'));
});
