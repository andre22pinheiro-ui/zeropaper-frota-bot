# 🏛️ ZeroPaperFrota Dedicated Bot — Arquitetura de Software

## 1. Visão Geral

O **ZeroPaperFrota Bot** (`@zeropaperfrotaBot`) é uma interface conversacional e transacional de missão crítica, desenhada para comunicar diretamente com o ecossistema do **AppFrota** ([appfrota-ten.vercel.app](https://appfrota-ten.vercel.app)).

Ao contrário de bots convencionais, opera sob o princípio de **execução determinística com confirmação interativa em 2 passos (Temperatura 0.0)**:
- Nenhuma operação de escrita é gravada de imediato.
- A IA extrai entidades em formato JSON estrito.
- As regras de negócio validam os dados (não-decrescimento de odómetro, integridade de stock, termos de segurança).
- O utilizador visualiza um resumo prévio e deve carregar obrigatoriamente no botão `[✅ Confirmar Registo]`.

## 2. Camadas da Aplicação

```text
[ Telegram User ]
       │
       ▼
[ Telegraf Webhook / Polling ] ──> [ Middleware de Identificação (from.id) ]
                                                  │
       ┌──────────────────────────────────────────┴──────────────────────────────────────┐
       │ Leitura Direta                                                                  │ Escrita Proposta
       ▼                                                                                 ▼
[ Fleet / Stock Service ]                                                    [ Intent Classifier (JSON Schema) ]
       │                                                                                 │
       ▼                                                                                 ▼
[ Resposta Imediata ]                                                        [ Validação de Regras de Domínio ]
                                                                                         │
                                                                                         ▼
                                                                             [ Confirmação Interativa (2 Passos) ]
                                                                             [✅ Confirmar]       [❌ Cancelar]
                                                                                   │
                                                                                   ▼
                                                                             [ Atomic Transaction / Repositories ]
                                                                                   │
                                                                                   ▼
                                                                             [ Supabase AppFrota ]
```

## 3. Prevenção de Duplicações e Idempotência

Cada operação gera uma chave SHA-256 única baseada em:
`hash(userId + operationType + payload)`

Se a mesma mensagem ou requisição for reenviada (por falha de rede ou duplo clique), o motor de idempotência interceta a chamada e devolve a resposta em cache sem gerar uma segunda gravação na base de dados.
