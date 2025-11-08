import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    // Buscar dados para análise
    const [dealsResult, tasksResult] = await Promise.all([
      supabase.from('deals').select('*'),
      supabase.from('tasks').select('*')
    ]);

    const deals = dealsResult.data || [];
    const tasks = tasksResult.data || [];

    // Calcular dados de vendas
    const salesData = deals
      .filter(d => d.stage === 'Closed Won')
      .map(d => ({
        name: new Date(d.created_at).toLocaleDateString('pt-BR', { month: 'short' }),
        sales: 1,
        revenue: parseFloat(d.value)
      }));

    // Agrupar por mês
    const salesByMonth: Record<string, { sales: number; revenue: number }> = {};
    salesData.forEach(item => {
      if (!salesByMonth[item.name]) {
        salesByMonth[item.name] = { sales: 0, revenue: 0 };
      }
      salesByMonth[item.name].sales += item.sales;
      salesByMonth[item.name].revenue += item.revenue;
    });

    const salesChartData = Object.entries(salesByMonth).map(([name, data]) => ({
      name,
      sales: data.sales,
      revenue: data.revenue
    }));

    // Dados de estágios
    const dealStageData = [
      { name: 'Prospecting', value: deals.filter(d => d.stage === 'Prospecting').length, color: '#3b82f6' },
      { name: 'Qualification', value: deals.filter(d => d.stage === 'Qualification').length, color: '#8b5cf6' },
      { name: 'Proposal', value: deals.filter(d => d.stage === 'Proposal').length, color: '#f59e0b' },
      { name: 'Negotiation', value: deals.filter(d => d.stage === 'Negotiation').length, color: '#ef4444' },
      { name: 'Closed Won', value: deals.filter(d => d.stage === 'Closed Won').length, color: '#10b981' },
      { name: 'Closed Lost', value: deals.filter(d => d.stage === 'Closed Lost').length, color: '#6b7280' }
    ];

    // Previsões de churn (simplificado - em produção usaria ML)
    const churnPredictions = deals
      .filter(d => d.stage === 'Closed Won')
      .slice(0, 5)
      .map((deal, index) => ({
        id: `churn-${deal.id}`,
        companyName: deal.company_name,
        churnRisk: Math.random() * 30 + 10, // 10-40% de risco
        primaryReason: ['Preço', 'Serviço', 'Concorrência', 'Necessidade'][index % 4],
        suggestedAction: ['Revisar contrato', 'Melhorar suporte', 'Oferecer desconto', 'Reunião estratégica'][index % 4]
      }));

    // Oportunidades de upsell
    const upsellOpportunities = deals
      .filter(d => d.stage === 'Closed Won')
      .slice(0, 5)
      .map((deal, index) => ({
        id: `upsell-${deal.id}`,
        companyName: deal.company_name,
        opportunityType: (index % 2 === 0 ? 'Upsell' : 'Cross-sell') as 'Upsell' | 'Cross-sell',
        productSuggestion: ['Plano Premium', 'Serviço Adicional', 'Expansão', 'Novo Produto'][index % 4],
        confidence: Math.random() * 30 + 60, // 60-90% de confiança
        potentialValue: parseFloat(deal.value) * (0.2 + Math.random() * 0.3) // 20-50% do valor atual
      }));

    // Relatório automatizado (resumo básico)
    const report = {
      title: 'Relatório de Análise Mensal',
      summary: `Total de ${deals.length} negócios, ${tasks.length} tarefas. Receita total: R$ ${deals.filter(d => d.stage === 'Closed Won').reduce((sum, d) => sum + parseFloat(d.value), 0).toLocaleString('pt-BR')}`,
      generatedAt: new Date().toISOString()
    };

    response.status(200).json({
      report,
      churnPredictions,
      upsellOpportunities,
      salesData: salesChartData,
      dealData: dealStageData
    });
  } catch (error: any) {
    console.error('Error in analytics-data API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

