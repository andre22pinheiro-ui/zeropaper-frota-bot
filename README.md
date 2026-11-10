# 🚛 ZeroPaperFrota Dedicated Bot (@zeropaperfrotaBot)

Bot Telegram oficial e dedicado para a gestão operacional da frota rodoviária do **AppFrota** ([appfrota-ten.vercel.app](https://appfrota-ten.vercel.app)).

## 🌟 Funcionalidades Principais

- 🔢 **Quilometragens & Turnos**: Registo de odómetro com barreira anti-decrescimento e verificação de turno.
- 🚨 **Avarias & Oficina**: Reporte de anomalias com triagem de gravidade e imobilização de viaturas.
- 🧼 **Higienização**: Registo de desinfeções e lavagens diárias.
- 📋 **Vistorias**: Checklists digitais de conformidade (seguro, documentos, pneus, luzes).
- 🛠️ **Oficina & Serviços**: Intervenções mecânicas e despesas.
- 📦 **Stock de Armazém**: Controlo de peças e óleos com prevenção de stock negativo.
- 🎙️ **Transcrição de Voz Whisper**: Suporte para áudios naturais de motoristas em <400ms.
- 🔒 **Confirmação em 2 Passos**: Nenhuma operação altera a base de dados sem confirmação interativa com botões.
- 🛡️ **Idempotência**: Prevenção estrita de registos duplicados.

## 🚀 Como Iniciar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Executar testes automatizados
npm test

# 3. Iniciar o serviço
npm start
```

## 🧪 Testes

O projeto inclui uma suite de testes unitários e de integração nativa do Node.js:
```bash
npm test
```
Resultados: 10/10 testes aprovados com cobertura das regras de negócio e validações de integridade.
