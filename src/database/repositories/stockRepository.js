// src/database/repositories/stockRepository.js — Acesso a Dados da Tabela 'stock'
import { supabase, executeQuery } from '../supabase.js';

export class StockRepository {
  async getAll() {
    return await executeQuery(
      supabase
        .from('stock')
        .select('*')
        .order('item', { ascending: true }),
      'StockRepository.getAll'
    );
  }

  async findByName(query) {
    const normalize = str => String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const qClean = normalize(query);
    const qWords = qClean.split(/\s+/).filter(w => w.length > 2);
    const items = await this.getAll();

    // 1. Correspondência exata ou por substring direta
    const direct = items.find(s => {
      const sNorm = normalize(s.item);
      return sNorm.includes(qClean) || qClean.includes(sNorm);
    });
    if (direct) return direct;

    // 2. Correspondência por palavras e radicais (ex: filtro / filtros)
    return items.find(s => {
      const sNorm = normalize(s.item);
      return qWords.length > 0 && qWords.every(w => {
        const root = w.replace(/s$/, '');
        return sNorm.includes(root);
      });
    }) || null;
  }

  async updateQuantity(id, newQuantity) {
    return await executeQuery(
      supabase
        .from('stock')
        .update({
          quantidade: Math.max(0, parseInt(newQuantity, 10)),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single(),
      'StockRepository.updateQuantity'
    );
  }

  async insert(record) {
    return await executeQuery(
      supabase
        .from('stock')
        .insert({
          item: record.item,
          quantidade: parseInt(record.quantidade, 10) || 0,
          minimo: parseInt(record.minimo, 10) || 5,
          categoria: record.categoria || 'Geral',
          unidade: record.unidade || 'unidade'
        })
        .select()
        .single(),
      'StockRepository.insert'
    );
  }
}

export const stockRepository = new StockRepository();
export default stockRepository;

