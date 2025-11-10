/**
 * api/analytics-report.ts
 * 
 * Endpoint para geração de relatórios automatizados usando Gemini AI
 * 
 * Agrega dados de vendas do período e gera relatório executivo
 * com insights acionáveis.
 * 
 * @see PLANO_PRODUCAO.md - Seção 4 (Agentes IA)
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAutomatedReport } from '../services/geminiService.ts';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parâmetros de período (default: últimos 30 dias)
    const daysParam = req.query.days ? parseInt(req.query.days as string) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysParam);

    const periodLabel = daysParam === 30 ? 'Últimos 30 dias' :
                       daysParam === 7 ? 'Últimos 7 dias' :
                       `Últimos ${daysParam} dias`;

    // 1. Buscar todos os deals do período
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (dealsError) throw dealsError;

    if (!deals || deals.length === 0) {
      return res.status(200).json({
        title: 'Sem dados no período',
        summary: '<p>Não há dados suficientes para gerar um relatório neste período.</p>',
        generatedAt: new Date().toISOString()
      });
    }

    // 2. Calcular métricas
    const totalDeals = deals.length;
    const wonDeals = deals.filter(d => d.stage === 'Closed Won').length;
    const lostDeals = deals.filter(d => d.stage === 'Closed Lost').length;
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const avgDealValue = totalValue / totalDeals;
    const conversionRate = (wonDeals / totalDeals) * 100;

    // 3. Encontrar CNAE mais comum (se houver empresas vinculadas)
    const cnpjs = deals.map(d => d.empresa_cnpj).filter(Boolean);
    let topCnae = 'Desconhecido';
    
    if (cnpjs.length > 0) {
      const { data: empresas } = await supabase
        .from('empresas')
        .select('cnae_principal_descricao')
        .in('cnpj', cnpjs);

      if (empresas && empresas.length > 0) {
        const cnaeCounts = empresas.reduce((acc: Record<string, number>, e: any) => {
          const cnae = e.cnae_principal_descricao || 'Desconhecido';
          acc[cnae] = (acc[cnae] || 0) + 1;
          return acc;
        }, {});

        topCnae = Object.entries(cnaeCounts).sort((a, b) => b[1] - a[1])[0][0];
      }
    }

    // 4. Gerar relatório com Gemini AI
    const report = await generateAutomatedReport({
      total_deals: totalDeals,
      total_value: totalValue,
      won_deals: wonDeals,
      lost_deals: lostDeals,
      avg_deal_value: avgDealValue,
      top_cnae: topCnae,
      conversion_rate: conversionRate,
      period: periodLabel,
    });

    return res.status(200).json(report);

  } catch (error: any) {
    console.error('Erro ao gerar relatório automatizado:', error);
    return res.status(500).json({
      error: 'Erro ao gerar relatório',
      message: error.message
    });
  }
}
