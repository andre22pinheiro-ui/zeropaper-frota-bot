// tests/unit/cloudWebhook.test.js — Verificação de Isolamento Cloud-Native (@zeropaperfrotaBot)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mountFleetWebhookTransport } from '../../src/services/fleetWebhookTransport.js';
import { amaranteHeavyMapService } from '../../src/services/amaranteHeavyMapService.js';
import { fleetComplianceService } from '../../src/services/fleetComplianceService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

test('ZeroPaperFrota Cloud-Native: TELEGRAM_FROTAS_TOKEN, /webhook/frota e render 17bj isolado', () => {
  const telegramSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/bot/telegram.js'), 'utf-8');
  assert.ok(telegramSrc.includes('TELEGRAM_FROTAS_TOKEN'), 'telegram.js deve priorizar TELEGRAM_FROTAS_TOKEN');

  const serverSrc = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf-8');
  assert.ok(serverSrc.includes('/webhook/frota'), 'server.js deve expor POST /webhook/frota');
  assert.ok(serverSrc.includes('setWebhook'), 'server.js deve registar webhook quando RENDER_EXTERNAL_URL estiver definido');
  assert.ok(serverSrc.includes('telegram-master-bot-17bj.onrender.com'), 'server.js deve apontar keep-alive ao serviço Render 17bj');
  assert.ok(serverSrc.includes('/health'), 'server.js deve manter keep-alive /health');

  const renderYaml = fs.readFileSync(path.join(ROOT_DIR, 'render.yaml'), 'utf-8');
  assert.ok(renderYaml.includes('TELEGRAM_FROTAS_TOKEN'), 'render.yaml deve definir TELEGRAM_FROTAS_TOKEN');
  assert.ok(renderYaml.includes('SUPABASE_URL'), 'render.yaml deve manter isolamento Supabase do ZeroPaperFrota');
  assert.ok(renderYaml.includes('ORS_API_KEY'), 'render.yaml deve manter ORS_API_KEY do ZeroPaperFrota');
  assert.ok(renderYaml.includes('telegram-master-bot-17bj.onrender.com'), 'render.yaml deve documentar serviço 17bj');
});

test('mountFleetWebhookTransport: reutiliza getWebhookInfo, faz backoff 429 e nunca faz polling na nuvem', async () => {
  const webhookUrl = 'https://telegram-master-bot-17bj.onrender.com/webhook/frota';

  let setCallsReuse = 0;
  const reuseRes = await mountFleetWebhookTransport({
    webhookUrl,
    usePolling: false,
    isCloudEnv: true,
    botInstance: {
      telegram: {
        getMe: async () => ({ id: 9280427698, username: 'zeropaperfrotaBot' }),
        getWebhookInfo: async () => ({ url: webhookUrl }),
        setWebhook: async () => {
          setCallsReuse++;
        }
      }
    }
  });
  assert.equal(reuseRes.reused, true);
  assert.equal(setCallsReuse, 0);

  let setCallsRetry = 0;
  const sleeps = [];
  const retryRes = await mountFleetWebhookTransport({
    webhookUrl,
    webhookSecret: 'sec_test',
    usePolling: false,
    isCloudEnv: true,
    sleepFn: async (ms) => sleeps.push(ms),
    botInstance: {
      telegram: {
        getMe: async () => ({ id: 9280427698 }),
        getWebhookInfo: async () => ({ url: '' }),
        setWebhook: async (_url, opts) => {
          assert.equal(opts.secret_token, 'sec_test');
          setCallsRetry++;
          if (setCallsRetry === 1) {
            const err = new Error('429 Too Many Requests');
            err.response = { parameters: { retry_after: 2 } };
            throw err;
          }
        }
      }
    }
  });
  assert.equal(retryRes.attempts, 2);
  assert.deepEqual(sleeps, [2000]);

  let launched = false;
  const idleRes = await mountFleetWebhookTransport({
    webhookUrl: null,
    usePolling: false,
    isCloudEnv: true,
    botInstance: {
      telegram: { deleteWebhook: async () => {} },
      launch: async () => {
        launched = true;
      }
    }
  });
  assert.equal(idleRes.mode, 'idle');
  assert.equal(launched, false);
});

test('Cartografia OSM Amarante e Formação TCC/GSR2 carregam localmente sem alucinação', () => {
  const corridors = amaranteHeavyMapService.getHeavyVehicleCorridors();
  assert.equal(corridors.loaded, true);
  assert.ok(corridors.streetsCount > 100);
  assert.ok(corridors.busStopsCount > 0);
  const note = amaranteHeavyMapService.formatAmaranteHeavyNote();
  assert.ok(note.includes('OSM Amarante'));

  const tcc = fleetComplianceService.consultFleetCompliance('criancas escolar lei 13/2006');
  assert.ok(tcc.includes('UFCD-TCC-02') && tcc.includes('16 anos'));
  const gsr2 = fleetComplianceService.consultFleetCompliance('bsis gsr2');
  assert.ok(gsr2.includes('UFCD-TCC-03') && gsr2.includes('2019/2144'));
});

