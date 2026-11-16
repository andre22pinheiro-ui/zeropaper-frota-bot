# MEMORY.md — zeropaper-frota-bot

## 1. Estado Técnico Real e Stack
- **Runtime:** Node.js `>=18.0.0` (executado em v26.13.1, npm 12.1.0, ES Modules).
- **Frameworks:** Telegraf (`^4.16.3`), Express (`^4.21.2`), Axios (`^1.7.9`), Dotenv (`^16.4.7`).
- **Base de Dados:** Supabase Cloud (`@supabase/supabase-js ^2.48.1`), PostgREST / PostgreSQL.
- **Topologia de Acesso a Dados:** 8 repositórios de domínio isolados em `src/database/repositories/` (`viaturas`, `km_registos`, `servicos`, `checklists`, `higienizacoes`, `anomalias`, `stock`, `pessoal`).
- **Isolamento de Base de Dados:** Zero dependência ou acesso a SQLite local familiar; operação 100% cloud-native direcionada para o projeto Supabase.

## 2. Decisões de Arquitetura e Governação
- **Governação Determinística:** Inferência cognitiva com `temperature: 0.0`. Autorizações operacionais (RBAC) e regras de validação rodoviária executadas no código JavaScript.
- **Transporte de Webhooks Cloud-Native:** Webhook exclusivo `/webhook/frota` com fallback de segurança que bloqueia polling quando deteta ambiente cloud Render (prevenindo erro Telegram HTTP 409).
- **Validação Rodoviária:**
  - Tacógrafo e tempos de repouso em conformidade matemática estrita com o Regulamento (CE) n.º 561/2006.
  - Conformidade de transporte escolar segundo a Lei n.º 13/2006.
  - Cartografia local offline com 125 vias de Amarante e integração OpenRouteService com perfil `driving-hgv`.

## 3. Registo de Correções e Higienização
- **Eliminação de Ficheiros de Credenciais:** Removido `.env` com segredos locais e pasta `.gemini/settings.json` que continha cópia de tokens.
- **Atualização do `.gitignore`:** Proteção alargada para `.env`, `.env.*`, `logs/*.log`, `data/` e ficheiros de base de dados.
- **Neutralização de Configuração:** Injeção de variáveis de Chefia (`ADMIN_TELEGRAM_ID`) e credenciais delegadas para `process.env`.
- **Suíte de Testes:** 100% de sucesso (36/36 testes aprovados via `node --test tests/**/*.test.js`).

