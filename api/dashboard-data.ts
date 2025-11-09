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
    // Buscar dados agregados
    const [dealsResult, tasksResult, empresasResult] = await Promise.all([
      supabase.from('deals').select('id, value, stage, created_at'),
      supabase.from('tasks').select('id, title, status, priority, created_at'),
      supabase.from('empresas').select('cnpj').limit(1)
    ]);

    const deals = dealsResult.data || [];
    const tasks = tasksResult.data || [];

    // Calcular estatísticas
    const totalRevenue = deals
      .filter(d => d.stage === 'Closed Won')
      .reduce((sum, d) => sum + parseFloat(d.value), 0);

    const totalDeals = deals.length;
    const activeDeals = deals.filter(d => 
      !['Closed Won', 'Closed Lost'].includes(d.stage)
    ).length;

    const pendingTasks = tasks.filter(t => t.status === 'A Fazer').length;
    const totalTasks = tasks.length;

    // Calcular dados do gráfico de vendas (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentDeals = deals.filter(d => 
      new Date(d.created_at) >= sixMonthsAgo
    );

    // Agrupar por mês
    const salesByMonth: Record<string, { sales: number; revenue: number }> = {};
    recentDeals.forEach(deal => {
      const date = new Date(deal.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!salesByMonth[monthKey]) {
        salesByMonth[monthKey] = { sales: 0, revenue: 0 };
      }
      salesByMonth[monthKey].sales += 1;
      if (deal.stage === 'Closed Won') {
        salesByMonth[monthKey].revenue += parseFloat(deal.value);
      }
    });

    const salesChartData = Object.entries(salesByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, data]) => ({
        name: new Date(name + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        sales: data.sales,
        revenue: data.revenue
      }));

    // Dados de estágios de negócios
    const dealStageData = [
      { name: 'Prospecting', value: deals.filter(d => d.stage === 'Prospecting').length, color: '#3b82f6' },
      { name: 'Qualification', value: deals.filter(d => d.stage === 'Qualification').length, color: '#8b5cf6' },
      { name: 'Proposal', value: deals.filter(d => d.stage === 'Proposal').length, color: '#f59e0b' },
      { name: 'Negotiation', value: deals.filter(d => d.stage === 'Negotiation').length, color: '#ef4444' },
      { name: 'Closed Won', value: deals.filter(d => d.stage === 'Closed Won').length, color: '#10b981' },
      { name: 'Closed Lost', value: deals.filter(d => d.stage === 'Closed Lost').length, color: '#6b7280' }
    ];

    // Atividades recentes (últimas 10 tarefas e negócios)
    const recentActivities = [
      ...tasks.slice(0, 5).map(t => ({
        id: `task-${t.id}`,
        user: { name: 'Sistema', avatar: '' },
        action: 'Tarefa criada',
        target: t.title,
        timestamp: t.created_at
      })),
      ...deals.slice(0, 5).map(d => ({
        id: `deal-${d.id}`,
        user: { name: 'Sistema', avatar: '' },
        action: 'Negócio atualizado',
        target: `Negócio ${d.stage}`,
        timestamp: d.created_at
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Stat Cards
    const statCardsData = [
      {
        title: 'Receita Total',
        value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        change: '+12.5%',
        changeType: 'increase' as const
      },
      {
        title: 'Negócios Ativos',
        value: activeDeals.toString(),
        change: '+5',
        changeType: 'increase' as const
      },
      {
        title: 'Tarefas Pendentes',
        value: pendingTasks.toString(),
        change: '-3',
        changeType: 'decrease' as const
      },
      {
        title: 'Taxa de Conversão',
        value: totalDeals > 0 ? `${Math.round((deals.filter(d => d.stage === 'Closed Won').length / totalDeals) * 100)}%` : '0%',
        change: '+2.1%',
        changeType: 'increase' as const
      }
    ];

    response.status(200).json({
      statCardsData,
      salesChartData,
      dealStageData,
      recentActivities
    });
  } catch (error: any) {
    console.error('Error in dashboard-data API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

