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
    const qClean = String(query).toLowerCase().trim();
    const items = await this.getAll();
    return items.find(s => s.item.toLowerCase().includes(qClean) || qClean.includes(s.item.toLowerCase())) || null;
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

