# 🗄️ ZeroPaperFrota — Correspondência e Esquema de Base de Dados

**Host Supabase:** `https://bwibtpcunojmtnrnqpvg.supabase.co`  
**Motor SQL:** PostgreSQL com RLS e extensões UUID

## 1. Mapeamento de Tabelas Operacionais

| Tabela | Função no AppFrota | Repositório | Ações Principais |
| :--- | :--- | :--- | :--- |
| `viaturas` | Cadastro, odómetro e estado operacional | `fleetRepository` | Leitura de odómetro, atualização de status (`disponivel`, `manutencao`) |
| `km_registos` | Histórico de viagens, turnos e odómetros | `kmRepository` | Inserção de registo de turno com delta e condutor |
| `anomalias` | Registo de avarias, danos e sinistros | `anomalyRepository` | Inserção de anomalia, triagem e imobilização |
| `higienizacoes` | Registo de lavagens e desinfeções | `hygieneRepository` | Inserção de higienização por viatura |
| `checklists` | Vistorias diárias de conformidade | `checklistRepository` | Inserção de checklist com JSONB de documentos e luzes |
| `servicos` | Manutenções e serviços de oficina | `maintenanceRepository` | Inserção de custos e descrição de peças trocadas |
| `stock` | Peças, lubrificantes e consumíveis | `stockRepository` | Atualização de quantidades com barreira de não-negatividade |
| `pessoal` | Colaboradores e perfis operacionais | `personnelRepository` | Verificação de identidade e função operacional |

## 2. Regras de Integridade

1. **Odómetro Nunca Recua**: `km_fim >= km_inicio`. Tentativas com valores inferiores são rejeitadas.
2. **Stock Não-Negativo**: Operações de saída que resultem em saldo < 0 são estritamente bloqueadas.
3. **Imobilização Automática**: Anomalias com termo crítico de segurança colocam automaticamente a viatura em `manutencao`.

