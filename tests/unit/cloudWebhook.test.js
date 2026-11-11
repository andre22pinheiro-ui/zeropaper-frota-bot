// tests/unit/cloudWebhook.test.js — Verificação de Isolamento Cloud-Native (@zeropaperfrotaBot)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

test('ZeroPaperFrota Cloud-Native: TELEGRAM_FROTAS_TOKEN, /webhook/frota e render.yaml isolado', () => {
  const telegramSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/bot/telegram.js'), 'utf-8');
  assert.ok(telegramSrc.includes('TELEGRAM_FROTAS_TOKEN'), 'telegram.js deve priorizar TELEGRAM_FROTAS_TOKEN');

  const serverSrc = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf-8');
  assert.ok(serverSrc.includes('/webhook/frota'), 'server.js deve expor POST /webhook/frota');
  assert.ok(serverSrc.includes('setWebhook'), 'server.js deve registar webhook quando RENDER_EXTERNAL_URL estiver definido');
  assert.ok(serverSrc.includes('/health'), 'server.js deve manter keep-alive /health');

  const renderYaml = fs.readFileSync(path.join(ROOT_DIR, 'render.yaml'), 'utf-8');
  assert.ok(renderYaml.includes('TELEGRAM_FROTAS_TOKEN'), 'render.yaml deve definir TELEGRAM_FROTAS_TOKEN');
  assert.ok(renderYaml.includes('SUPABASE_URL'), 'render.yaml deve manter isolamento Supabase do ZeroPaperFrota');
  assert.ok(renderYaml.includes('ORS_API_KEY'), 'render.yaml deve manter ORS_API_KEY do ZeroPaperFrota');
});

