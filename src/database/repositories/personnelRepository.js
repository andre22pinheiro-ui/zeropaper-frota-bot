// src/database/repositories/personnelRepository.js — Acesso a Dados da Tabela 'pessoal'
import { supabase, executeQuery } from '../supabase.js';

export class PersonnelRepository {
  async getAll() {
    return await executeQuery(
      supabase
        .from('pessoal')
        .select('id, nome, numero, perfil, estado, telemovel, created_at')
        .order('numero', { ascending: true }),
      'PersonnelRepository.getAll'
    );
  }

  async findByNumero(numero) {
    const numClean = String(numero).trim();
    return await executeQuery(
      supabase
        .from('pessoal')
        .select('*')
        .eq('numero', numClean)
        .maybeSingle(),
      'PersonnelRepository.findByNumero'
    );
  }

  async findByNome(nome) {
    const qClean = String(nome).toLowerCase().trim();
    const all = await this.getAll();
    return all.find(p => p.nome.toLowerCase().includes(qClean)) || null;
  }
}

export const personnelRepository = new PersonnelRepository();
export default personnelRepository;
