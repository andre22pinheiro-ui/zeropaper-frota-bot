// src/services/fleetComplianceService.js — Conformidade Legal, TCC (Lei 13/2006), GSR2 & Formação CCP Pesados (Temperatura 0.0)
import { createLogger } from '../utils/logger.js';

const log = createLogger('FleetCompliance');

export const TCC_PEDAGOGICAL_DATABASE = {
  modulos_formacao: [
    {
      id: 'mod_1_tempos',
      codigo: 'UFCD-TCC-01',
      titulo: 'Regulamentação Social Europeia: Condução, Pausas e Tacógrafo Inteligente Gen 2',
      carga_horaria: '14 horas',
      objetivo_pedagogico:
        'Capacitar os formandos para a gestão autónoma dos períodos de condução e repouso, eliminando infrações graves e dominando o registo no Tacógrafo Inteligente v2 (Smart Tacho 2).',
      conteudos_programaticos: [
        'Regulamento (CE) n.º 561/2006 e Lei n.º 27/2010: Âmbito de aplicação e isenções.',
        'Condução contínua (4h30) e a regra estrita do fracionamento de pausas (15m + 30m, nunca ao contrário).',
        'Limites de condução diária (9h / até 2x 10h por semana), semanal (56h) e bi-semanal (90h).',
        'Regimes de repouso diário (11h regular ou 3h+9h; 9h reduzido até 3x) e repouso semanal (45h regular / 24h reduzido).',
        'Proibição formal de repouso semanal regular (>=45h) na cabina (Artigo 8.º, n.º 8 do Reg. 561/2006 e Acórdão TJUE C-102/16).',
        'Regulamento (UE) 165/2014 e Smart Tachograph Gen 2 (Reg. Execução UE 2021/1228): GNSS automático em passagens de fronteira, DSRC remoto para pré-fiscalização e OBW.'
      ],
      estudo_de_caso: {
        cenario:
          'Um motorista inicia a marcha às 06:00, conduz até às 09:00 (3h00), faz pausa de 20 min, retoma às 09:20 até às 10:50 (1h30) e para 25 min para somar 45 min.',
        analise_tecnica:
          'INFRAÇÃO GRAVE (Art. 7.º Reg. CE 561/2006). O fracionamento exige primeira pausa >=15 min seguida de segunda pausa >=30 min dentro das 4h30. Os 25 min finais não atingem o mínimo legal de 30 min.',
        solucao_pedagogica:
          'Estender a segunda paragem para 30 minutos ininterruptos (parando até às 11:20).'
      }
    },
    {
      id: 'mod_2_tcc',
      codigo: 'UFCD-TCC-02',
      titulo: 'Transporte Coletivo de Crianças (Lei n.º 13/2006): Segurança Passiva, Operação e Vigilância',
      carga_horaria: '21 horas',
      objetivo_pedagogico:
        'Formar motoristas e vigilantes com certificação oficial TCC sobre requisitos veiculares, retenção infantil e procedimentos de emergência.',
      conteudos_programaticos: [
        'Enquadramento jurídico da Lei n.º 13/2006 de 17 de abril alterada pela Lei n.º 34/2021.',
        'Requisitos da viatura TCC: Idade máxima improrrogável de 16 anos desde a 1.ª matrícula.',
        'Sistemas de Retenção para Crianças (SRI): Normas ECE R44/04 e UN R129 (i-Size), pontos ISOFIX e cintos de 3 pontos obrigatórios.',
        'Equipamentos obrigatórios: Extintor homologado, caixa de primeiros socorros certificada e painéis TCC frontal e retaguarda.',
        'Obrigatoriedade de Vigilante: Obrigatório com >7 crianças em viaturas de >9 lugares, OU sempre que transporte menores de 7 anos.',
        'Requisitos do Motorista TCC: Carta adequada há >2 anos, idade mínima 21 anos, certificado IMT Grupo 2 + psicotécnico e registo criminal idóneo.'
      ],
      estudo_de_caso: {
        cenario:
          'Uma carrinha de 16 lugares transporta 10 alunos do 1.º ciclo (6 a 9 anos) apenas com motorista, sem vigilante.',
        analise_tecnica:
          'CONTRAORDENAÇÃO MUITO GRAVE (Art. 8.º Lei n.º 13/2006): excede 7 crianças em veículo >9 lugares e transporta menores de 7 anos sem vigilante credenciado.',
        coima_e_sancao:
          'Coima aplicável à entidade transportadora (500€ a 2.500€) e apreensão cautelar de documentos até regularização.'
      }
    },
    {
      id: 'mod_3_gsr2',
      codigo: 'UFCD-TCC-03',
      titulo: 'Tecnologia de Pesados: Sistemas GSR2 (Reg. UE 2019/2144), EBS e ADAS',
      carga_horaria: '14 horas',
      objetivo_pedagogico:
        'Dominar o funcionamento operacional e a leitura de alertas dos sistemas obrigatórios do mandato europeu GSR2.',
      conteudos_programaticos: [
        'Mandato GSR2 (Reg. UE 2019/2144) aplicável a novas matrículas de pesados na União Europeia:',
        '1. ISA (Intelligent Speed Assistance): Leitura de sinalização e georreferenciação de limite legal.',
        '2. MOIS (Moving Off Information System — UN R159): Radares frontais para deteção de peões/ciclistas no arranque.',
        '3. BSIS (Blind Spot Information System — UN R151): Radares de ângulo morto lateral direito no autocarro/pesado.',
        '4. REVW (Reversing Detection): Câmaras e sensores de marcha-atrás.',
        '5. TPMS (Tire Pressure Monitoring System): Monitorização contínua de pressão e temperatura dos pneus.',
        '6. DDAW (Driver Drowsiness and Attention Warning): Deteção de fadiga e desvio de atenção.',
        '7. EDR (Event Data Recorder): Caixa negra com registo 30s pré-colisão e 5s pós-colisão.',
        'Travagem e Estabilidade: EBS, ESC/ESP antibalanceamento e retardador hidráulico/eletromagnético.'
      ],
      estudo_de_caso: {
        cenario:
          'Numa rotunda urbana, ao virar à direita com autocarro, o BSIS aciona alerta acústico e LED âmbar no pilar A direito.',
        analise_tecnica:
          'Deteção de utilizador vulnerável no ângulo morto direito (UN ECE R151). Imobilizar a manobra sem guinar e confirmar visualmente por espelho grande angular e câmara lateral antes de retomar.'
      }
    }
  ]
};

export function formatModuloTempos() {
  const mod = TCC_PEDAGOGICAL_DATABASE.modulos_formacao[0];
  return (
    `🎓 *MÓDULO TÉCNICO-PEDAGÓGICO (CCP) — ${mod.codigo}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📚 *Tema:* ${mod.titulo}\n` +
    `⏱️ *Carga Horária:* ${mod.carga_horaria}\n` +
    `🎯 *Objetivo:* ${mod.objetivo_pedagogico}\n\n` +
    `📋 *ENQUADRAMENTO NORMATIVO:*\n` +
    mod.conteudos_programaticos.map((c) => `• ${c}`).join('\n') +
    `\n\n🔬 *ESTUDO DE CASO PRÁTICO:*\n` +
    `📝 *Cenário:* _"${mod.estudo_de_caso.cenario}"_\n` +
    `⚖️ *Parecer Técnico:* ${mod.estudo_de_caso.analise_tecnica}\n` +
    `✅ *Correção:* ${mod.estudo_de_caso.solucao_pedagogica}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📜 *Diplomas:* Reg. (CE) 561/2006 | Lei 27/2010 | Reg. (UE) 165/2014 | Smart Tacho Gen 2 (Reg. UE 2021/1228)`
  );
}

export function formatModuloTcc() {
  const mod = TCC_PEDAGOGICAL_DATABASE.modulos_formacao[1];
  return (
    `🎓 *MÓDULO TÉCNICO-PEDAGÓGICO (CCP) — ${mod.codigo}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📚 *Tema:* ${mod.titulo}\n` +
    `⏱️ *Carga Horária:* ${mod.carga_horaria}\n` +
    `🎯 *Objetivo:* ${mod.objetivo_pedagogico}\n\n` +
    `📋 *REQUISITOS LEGAIS TCC:*\n` +
    mod.conteudos_programaticos.map((c) => `• ${c}`).join('\n') +
    `\n\n🔬 *ESTUDO DE CASO TCC:*\n` +
    `📝 *Cenário:* _"${mod.estudo_de_caso.cenario}"_\n` +
    `⚖️ *Parecer Técnico:* ${mod.estudo_de_caso.analise_tecnica}\n` +
    `🚨 *Regime Sancionatório:* ${mod.estudo_de_caso.coima_e_sancao}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 *DRE (Lei 13/2006):* https://dre.pt/dre/legislacao-consolidada/lei/2006-34575836`
  );
}

export function formatModuloGsr2() {
  const mod = TCC_PEDAGOGICAL_DATABASE.modulos_formacao[2];
  return (
    `🎓 *MÓDULO TÉCNICO-PEDAGÓGICO (CCP) — ${mod.codigo}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📚 *Tema:* ${mod.titulo}\n` +
    `⏱️ *Carga Horária:* ${mod.carga_horaria}\n` +
    `🎯 *Objetivo:* ${mod.objetivo_pedagogico}\n\n` +
    `📋 *SISTEMAS ADAS / GSR2:*\n` +
    mod.conteudos_programaticos.map((c) => `• ${c}`).join('\n') +
    `\n\n🔬 *PROCEDIMENTO DE CONDUÇÃO DEFENSIVA:*\n` +
    `📝 *Cenário:* _"${mod.estudo_de_caso.cenario}"_\n` +
    `⚙️ *Protocolo Técnico:* ${mod.estudo_de_caso.analise_tecnica}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📜 *Diplomas:* Reg. (UE) 2019/2144 (GSR2) | UN/ECE R151 (BSIS) e R159 (MOIS)`
  );
}

export function formatDreHeavyLinks(query = '') {
  const cleanSearch = encodeURIComponent(
    String(query)
      .replace(/^\/?(leis|lei|dre|diario da republica|diário da república)\s*/i, '')
      .trim() || 'Código da Estrada pesados'
  );
  return (
    `⚖️ *LEGISLAÇÃO OFICIAL DE TRANSPORTES PESADOS & TCC (PORTUGAL / UE)*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚛 *Limites Velocidade Pesados (DL 114/94 — Código da Estrada):*\n` +
    `• *Pesados Passageiros:* Localidades **50 km/h** | Vias Reservadas **90 km/h** | Autoestradas **100 km/h**\n` +
    `• *Pesados Mercadorias:* Localidades **50 km/h** | Vias Reservadas **80 km/h** | Autoestradas **90 km/h**\n` +
    `• *TAS Profissionais (Motoristas/TCC):* Limite legal **0,20 g/l** (0,20 a 0,49 Grave; >=0,50 Muito Grave; >=1,20 Crime).\n` +
    `• *Telemóvel (Art. 84.º CE):* Coima 250€ a 1.250€, -3 pontos, inibição 1 a 12 meses.\n\n` +
    `📜 *Diplomas Consolidados no DRE:*\n` +
    `• *Código da Estrada (DL 114/94):* https://dre.pt/dre/legislacao-consolidada/decreto-lei/1994-34537375\n` +
    `• *Tempos Condução (Lei 27/2010 / Reg. 561/2006):* https://dre.pt/dre/legislacao-consolidada/lei/2010-34538875\n` +
    `• *Transporte de Crianças (Lei 13/2006):* https://dre.pt/dre/legislacao-consolidada/lei/2006-34575836\n` +
    `• *Pesquisa Oficial DRE:* https://dre.pt/dre/pesquisa-geral?search=${cleanSearch}`
  );
}

export function formatPlanoFormacaoCompleto() {
  return (
    `🎓 *ZEROPAPERFROTA — FORMAÇÃO PROFISSIONAL & CONFORMIDADE CCP / CAM*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Enquadramento normativo determinístico (Diretiva 2003/59/CE & DL 126/2009 | CE 561/2006 | Lei 13/2006 | GSR2).\n\n` +
    `📚 *Comandos e Módulos Disponíveis:*\n` +
    `• \`/tcc tempos\` (**UFCD-TCC-01**): Reg. (CE) 561/2006, pausa fracionada 15m+30m, Smart Tacho Gen 2.\n` +
    `• \`/tcc criancas\` (**UFCD-TCC-02**): Lei 13/2006, 16 anos viatura, vigilante (>7 crianças em >9 lug. ou <7 anos), SRI R44/R129.\n` +
    `• \`/gsr2\` (**UFCD-TCC-03**): Reg. (UE) 2019/2144 — BSIS, MOIS, ISA, REVW, TPMS, DDAW, EDR, EBS.\n` +
    `• \`/leis [tema]\`: Código da Estrada pesados, TAS 0,20 g/l e links oficiais \`dre.pt\`.`
  );
}

export function consultFleetCompliance(query = '') {
  const q = String(query || '').toLowerCase().trim();
  log.info(`Consulta conformidade frota: "${q.slice(0, 60)}"`);

  if (!q) return formatPlanoFormacaoCompleto();

  if (
    q.includes('gsr2') ||
    q.includes('gsr') ||
    q.includes('adas') ||
    q.includes('bsis') ||
    q.includes('mois') ||
    q.includes('isa') ||
    q.includes('edr') ||
    q.includes('ebs') ||
    q.includes('retarder')
  ) {
    return formatModuloGsr2();
  }

  if (
    q.includes('crianca') ||
    q.includes('criança') ||
    q.includes('escolar') ||
    q.includes('vigilante') ||
    q.includes('13/2006') ||
    q.includes('16 anos') ||
    q.includes('sri') ||
    q.includes('cadeirinha')
  ) {
    return formatModuloTcc();
  }

  if (
    q.includes('tempo') ||
    q.includes('conducao') ||
    q.includes('condução') ||
    q.includes('repouso') ||
    q.includes('gen 2') ||
    q.includes('smart tacho') ||
    q.includes('165/2014') ||
    q.includes('2021/1228') ||
    q.includes('561') ||
    q.includes('fracion') ||
    q.includes('cabina')
  ) {
    return formatModuloTempos();
  }

  if (
    q.includes('dre') ||
    q.includes('lei') ||
    q.includes('codigo da estrada') ||
    q.includes('código da estrada') ||
    q.includes('velocidade') ||
    q.includes('alcool') ||
    q.includes('álcool') ||
    q.includes('tas') ||
    q.includes('cam') ||
    q.includes('cqm')
  ) {
    return formatDreHeavyLinks(query);
  }

  return q.includes('tcc') ? formatModuloTcc() : formatPlanoFormacaoCompleto();
}

export const fleetComplianceService = {
  TCC_PEDAGOGICAL_DATABASE,
  formatModuloTempos,
  formatModuloTcc,
  formatModuloGsr2,
  formatDreHeavyLinks,
  formatPlanoFormacaoCompleto,
  consultFleetCompliance
};

export default fleetComplianceService;
