// src/database/repositories/vacationRepository.js — Acesso a Dados da Tabela 'pedidos_ferias' e 'pedidos_artigos'
import { supabase, executeQuery } from '../supabase.js';

export class VacationRepository {
  async getAll(limit = 30) {
    return await executeQuery(
      supabase
        .from('pedidos_ferias')
        .select('*')
        .order('data_inicio', { ascending: false })
        .limit(limit),
      'VacationRepository.getAll'
    );
  }

  async getPending() {
    return await executeQuery(
      supabase
        .from('pedidos_ferias')
        .select('*')
        .eq('estado', 'Pendente')
        .order('data_inicio', { ascending: true }),
      'VacationRepository.getPending'
    );
  }

  async getByPersonnel(numeroFuncionario) {
    const num = String(numeroFuncionario || '').trim();
    return await executeQuery(
      supabase
        .from('pedidos_ferias')
        .select('*')
        .eq('numero_funcionario', num)
        .order('data_inicio', { ascending: false }),
      'VacationRepository.getByPersonnel'
    );
  }

  async insert(record) {
    return await executeQuery(
      supabase
        .from('pedidos_ferias')
        .insert({
          nome_funcionario: record.nome_funcionario,
          numero_funcionario: String(record.numero_funcionario),
          perfil: record.perfil || 'Motorista',
          data_inicio: record.data_inicio,
          data_fim: record.data_fim,
          datas_selecionadas: record.datas_selecionadas || [record.data_inicio],
          motivo: record.motivo || null,
          estado: 'Pendente'
        })
        .select()
        .single(),
      'VacationRepository.insert'
    );
  }

  async decide(id, estado, decididoPor = 'Chefia', observacoes = null) {
    return await executeQuery(
      supabase
        .from('pedidos_ferias')
        .update({
          estado,
          decidido_por: decididoPor,
          decidido_em: new Date().toISOString(),
          observacoes_decisao: observacoes
        })
        .eq('id', id)
        .select()
        .single(),
      'VacationRepository.decide'
    );
  }

  async getArticleRequests(limit = 20) {
    return await executeQuery(
      supabase
        .from('pedidos_artigos')
        .select('*')
        .order('data_ocorrencia', { ascending: false })
        .limit(limit),
      'VacationRepository.getArticleRequests'
    );
  }
}

export const vacationRepository = new VacationRepository();
export default vacationRepository;
