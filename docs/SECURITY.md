# 🔒 ZeroPaperFrota — Diretivas de Segurança e Acesso

## 1. Identificação Numérica Telegram

A segurança baseia-se exclusivamente no ID numérico do Telegram (`ctx.from.id`). Nunca em `username` ou nome visível (que podem ser alterados pelo utilizador).

## 2. Perfis Operacionais e Permissões

- **Chefia / Administrador (ID: 950415577 — André Pinheiro)**:
  * Acesso irrestrito a todas as operações de frota, stock, utilizadores e auditoria.
  * Pode autorizar novos IDs de Telegram com o comando `/autorizar`.
- **Motorista**:
  * Consultar viaturas (`/frota`, `/viaturas`).
  * Registar quilometragem (`/km`).
  * Reportar anomalias (`/avaria`).
  * Submeter checklist diária (`/vistoria`).
- **Oficina / Mecânico**:
  * Consultar viaturas e avarias ativas.
  * Registar reparações e manutenções (`/oficina`).
  * Movimentar stock (`/stock`).
- **Vigilante / Higienização**:
  * Registar lavagens e desinfeções (`/lavagem`).
  * Reportar anomalias estéticas/de limpeza.

## 3. Gestão de Segredos

- Nenhuma credencial (JWT, chaves Supabase, tokens Telegram) é guardada no código.
- O logger estruturado possui sanitizadores regex (`[REDACTED]`) para impedir que tokens apareçam nos logs.

