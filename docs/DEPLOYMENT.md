# 🚀 ZeroPaperFrota — Procedimento de Deployment no Render

## 1. Configuração do Serviço no Render

- **Tipo:** Web Service
- **Nome:** `zeropaper-frota-bot`
- **Ambiente:** Node.js (>= 18)
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

## 2. Variáveis de Ambiente no Render Dashboard

```env
NODE_ENV=production
PORT=10000
TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_ID=950415577
SUPABASE_URL=https://bwibtpcunojmtnrnqpvg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
APP_BASE_URL=https://appfrota-ten.vercel.app
LOG_LEVEL=info
```

## 3. Verificação Pós-Deploy

1. Aceder a `https://<render-url>/health` e verificar se devolve `{"status":"healthy"}` com latência Supabase.
2. Abrir o Telegram e enviar `/start` para `@zeropaperfrotaBot`.
3. Executar `/frota` e confirmar que lista as 5 viaturas reais.
