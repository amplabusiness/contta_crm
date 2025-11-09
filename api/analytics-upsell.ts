/**
 * api/analytics-upsell.ts
 * 
 * Endpoint para identificação de oportunidades de upsell/cross-sell usando Gemini AI
 * 
 * Analisa clientes atuais e identifica serviços adicionais que poderiam
 * ser oferecidos com base no perfil da empresa.
 * 
 * @see PLANO_PRODUCAO.md - Seção 4 (Agentes IA)
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeUpsellOpportunityV2 } from '../services/geminiService.v2.ts';

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
    // 1. Buscar deals "Closed Won" (clientes ativos)
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('stage', 'Closed Won')
      .order('value', { ascending: false })
      .limit(20); // Top 20 clientes por valor

    if (dealsError) throw dealsError;

    if (!deals || deals.length === 0) {
      return res.status(200).json([]);
    }

    // 2. Para cada deal, buscar dados da empresa e analisar oportunidade
    const upsellOpportunities = [];

    for (const deal of deals) {
      // Buscar dados da empresa se disponível
      let companyData = null;
      if (deal.empresa_cnpj) {
        const { data: empresa } = await supabase
          .from('empresas')
          .select('porte, cnae_principal_descricao')
          .eq('cnpj', deal.empresa_cnpj)
          .single();
        
        companyData = empresa;
      }

      // Analisar oportunidade com Gemini AI V2 (otimizada)
      const analysis = await analyzeUpsellOpportunityV2({
        company_name: deal.company_name,
        current_value: deal.value,
        deal_stage: deal.stage,
        company_size: companyData?.porte || 'Desconhecido',
        industry: companyData?.cnae_principal_descricao || 'Desconhecido',
      });

      // Filtrar apenas oportunidades com confiança > 50%
      if (analysis.confidence >= 50) {
        upsellOpportunities.push({
          id: deal.id,
          companyName: deal.company_name,
          opportunityType: analysis.opportunity_type,
          productSuggestion: analysis.product_suggestion,
          confidence: analysis.confidence,
          potentialValue: analysis.potential_value,
        });
      }
    }

    // 3. Ordenar por valor potencial (maior primeiro)
    upsellOpportunities.sort((a, b) => b.potentialValue - a.potentialValue);

    // 4. Retornar top 10
    return res.status(200).json(upsellOpportunities.slice(0, 10));

  } catch (error: any) {
    console.error('Erro ao gerar oportunidades de upsell:', error);
    return res.status(500).json({
      error: 'Erro ao gerar análise de upsell',
      message: error.message
    });
  }
}
