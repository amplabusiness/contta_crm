import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAutomatedReport } from '../services/geminiService.ts';

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const ensureNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrencyBRL = (value: number): string =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const buildSalesTimeline = (deals: any[], months = 6) => {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const timeline: Record<string, { sales: number; revenue: number }> = {};

  deals.forEach((deal) => {
    const createdAt = deal.created_at ? new Date(deal.created_at) : undefined;
    if (!createdAt || Number.isNaN(createdAt.getTime()) || createdAt < rangeStart) {
      return;
    }

    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    
    if (!timeline[key]) {
      timeline[key] = { sales: 0, revenue: 0 };
    }

    timeline[key].sales += 1;
    if (deal.stage === 'Closed Won') {
      timeline[key].revenue += ensureNumber(deal.value);
    }
  });

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      name: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('pt-BR', {
        year: 'numeric',
      }),
      sales: value.sales,
      revenue: value.revenue,
    }));
};

const buildDealStageData = (deals: any[]) => {
  const stages: { name: string; color: string }[] = [
    { name: 'Prospecting', color: '#3b82f6' },
    { name: 'Qualification', color: '#8b5cf6' },
    { name: 'Proposal', color: '#f59e0b' },
    { name: 'Negotiation', color: '#ef4444' },
    { name: 'Closed Won', color: '#10b981' },
    { name: 'Closed Lost', color: '#6b7280' },
  ];

  return stages.map(({ name, color }) => ({
    name,
    color,
    value: deals.filter((deal) => deal.stage === name).length,
  }));
};

const buildRecentActivities = (deals: any[], tasks: any[], limit = 10) => {
  const activities = [
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      user: { name: 'Sistema', avatar: '' },
      action: 'Tarefa atualizada',
      target: task.title ?? 'Tarefa',
      timestamp: task.created_at ?? new Date().toISOString(),
    })),
    ...deals.map((deal) => ({
      id: `deal-${deal.id}`,
      user: { name: 'Sistema', avatar: '' },
      action: `Negócio ${deal.stage ?? 'Atualizado'}`,
      target: deal.company_name ?? 'Negócio',
      timestamp: deal.created_at ?? new Date().toISOString(),
    })),
  ]
    .filter((entry) => Boolean(entry.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, limit);
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  Object.entries(httpCorsHeaders).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const [dealsResult, tasksResult] = await Promise.all([
      supabase
        .from('deals')
        .select('id, company_name, value, stage, probability, expected_close_date, last_activity, created_at')
        .order('created_at', { ascending: false })
        .limit(400),
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, created_at, related_deal_name')
        .order('created_at', { ascending: false })
        .limit(400),
    ]);

    if (dealsResult.error) {
      throw dealsResult.error;
    }
    if (tasksResult.error) {
      throw tasksResult.error;
    }

    const deals = dealsResult.data ?? [];
    const tasks = tasksResult.data ?? [];

    const closedWonDeals = deals.filter((deal) => deal.stage === 'Closed Won');
    const totalRevenue = closedWonDeals.reduce(
      (acc, deal) => acc + ensureNumber(deal.value),
      0,
    );
    const totalDeals = deals.length;
    const activeDeals = deals.filter(
      (deal) => !['Closed Won', 'Closed Lost'].includes(deal.stage ?? ''),
    ).length;
    const pendingTasks = tasks.filter((task) => task.status === 'A Fazer').length;
    const totalTasks = tasks.length;

    const conversionRate = totalDeals > 0
      ? Math.round((closedWonDeals.length / totalDeals) * 100)
      : 0;

    const statCardsData = [
      {
        title: 'Receita Total',
        value: formatCurrencyBRL(totalRevenue),
        change: '+0%',
        changeType: 'increase' as const,
      },
      {
        title: 'Negócios Ativos',
        value: String(activeDeals),
        change: '+0',
        changeType: 'increase' as const,
      },
      {
        title: 'Tarefas Pendentes',
        value: String(pendingTasks),
        change: '+0',
        changeType: 'decrease' as const,
      },
      {
        title: 'Taxa de Conversão',
        value: `${conversionRate}%`,
        change: '+0%',
        changeType: 'increase' as const,
      },
    ];

    const salesChartData = buildSalesTimeline(deals);
    const dealStageData = buildDealStageData(deals);
    const recentActivities = buildRecentActivities(deals.slice(0, 20), tasks.slice(0, 20));

    let insightsHtml: string | null = null;
    // DEPRECATED: Use novo endpoint /api/analytics-report
    // const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    // if (geminiKey) {
    //   if (!process.env.API_KEY) {
    //     process.env.API_KEY = geminiKey;
    //   }
    //   try {
    //     insightsHtml = await generateAutomatedReport({...});
    //   } catch (geminiError: any) {
    //     console.warn('Falha ao gerar insights com Gemini:', geminiError?.message ?? geminiError);
    //   }
    // }

    response.status(200).json({
      statCardsData,
      salesChartData,
      dealStageData,
      recentActivities,
      insightsHtml,
    });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in dashboard-data API:', error);
    response.status(status).json({ message });
  }
}

