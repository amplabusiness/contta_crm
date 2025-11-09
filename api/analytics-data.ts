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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatCurrencyBRL = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const buildSalesTimeline = (deals: any[]) => {
  const timeline: Record<string, { revenue: number; count: number }> = {};

  deals.forEach((deal) => {
    if (deal.stage !== 'Closed Won') {
      return;
    }
    const createdAt = deal.created_at ? new Date(deal.created_at) : undefined;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return;
    }

    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (!timeline[key]) {
      timeline[key] = { revenue: 0, count: 0 };
    }

    timeline[key].count += 1;
    timeline[key].revenue += ensureNumber(deal.value);
  });

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, data]) => ({
      name: new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      sales: data.count,
      revenue: data.revenue,
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

const daysBetween = (from?: string | null) => {
  if (!from) {
    return 180;
  }
  const fromDate = new Date(from);
  if (Number.isNaN(fromDate.getTime())) {
    return 180;
  }
  const diff = Date.now() - fromDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const buildChurnPredictions = (deals: any[]) => {
  return deals
    .filter((deal) => deal.stage === 'Closed Won')
    .map((deal) => {
      const inactivityDays = daysBetween(deal.last_activity ?? deal.updated_at ?? deal.created_at);
      const dealValue = ensureNumber(deal.value);
      const probability = ensureNumber(deal.probability ?? 50);

      const baseRisk = 25 + inactivityDays * 0.6;
      const probabilityFactor = 40 - probability * 0.4;
      const valueFactor = dealValue > 50000 ? -8 : dealValue > 20000 ? -4 : 0;
      const churnRisk = clamp(baseRisk + probabilityFactor + valueFactor, 5, 95);

      const reasons = [
        'Engajamento baixo após a implementação',
        'Concorrência oferecendo proposta agressiva',
        'Percepção de custo elevado',
        'Processos internos ainda não adaptados',
      ];

      const actions = [
        'Agendar health-check com o cliente',
        'Oferecer treinamento adicional para a equipe',
        'Negociar revisão contratual ou bônus de fidelidade',
        'Apresentar roadmap de novas funcionalidades',
      ];

      const reasonIndex = Math.abs(deal.id?.toString().split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) ?? 0) % reasons.length;

      return {
        id: `churn-${deal.id}`,
        companyName: deal.company_name ?? 'Cliente',
        churnRisk,
        primaryReason: reasons[reasonIndex],
        suggestedAction: actions[reasonIndex],
      };
    })
    .sort((a, b) => b.churnRisk - a.churnRisk)
    .slice(0, 5);
};

const buildUpsellOpportunities = (deals: any[]) => {
  return deals
    .filter((deal) => deal.stage === 'Closed Won')
    .map((deal) => {
      const dealValue = ensureNumber(deal.value);
      const probability = ensureNumber(deal.probability ?? 60);
      const confidence = clamp(55 + probability * 0.3, 55, 92);
      const potentialValue = Math.round(dealValue * (0.15 + probability / 300));

      const suggestions = [
        'Plano Premium com dashboards avançados',
        'Módulo de automação fiscal e notas',
        'Projeto de consultoria para expansão',
        'Serviço de implantação multilojas',
      ];
      const types: Array<'Upsell' | 'Cross-sell'> = ['Upsell', 'Cross-sell'];

      const indexSeed = Math.abs(
        deal.id?.toString().split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) ??
          0,
      );

      return {
        id: `upsell-${deal.id}`,
        companyName: deal.company_name ?? 'Cliente',
        opportunityType: types[indexSeed % types.length],
        productSuggestion: suggestions[indexSeed % suggestions.length],
        confidence,
        potentialValue,
      };
    })
    .sort((a, b) => b.potentialValue - a.potentialValue)
    .slice(0, 5);
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
        .select(
          'id, company_name, value, stage, probability, last_activity, expected_close_date, created_at, updated_at',
        )
        .order('created_at', { ascending: false })
        .limit(600),
      supabase
        .from('tasks')
        .select('id, status, priority, due_date, created_at')
        .order('created_at', { ascending: false })
        .limit(600),
    ]);

    if (dealsResult.error) {
      throw dealsResult.error;
    }
    if (tasksResult.error) {
      throw tasksResult.error;
    }

    const deals = dealsResult.data ?? [];
    const tasks = tasksResult.data ?? [];

    const salesData = buildSalesTimeline(deals);
    const dealData = buildDealStageData(deals);
    const churnPredictions = buildChurnPredictions(deals);
    const upsellOpportunities = buildUpsellOpportunities(deals);

    const totalRevenue = deals
      .filter((deal) => deal.stage === 'Closed Won')
      .reduce((acc, deal) => acc + ensureNumber(deal.value), 0);

    const totalOpenDeals = deals.filter((deal) => !['Closed Won', 'Closed Lost'].includes(deal.stage ?? '')).length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_date) {
        return false;
      }
      const due = new Date(task.due_date);
      if (Number.isNaN(due.getTime())) {
        return false;
      }
      return due < new Date() && task.status !== 'Concluída';
    }).length;

    const summaryText = `Receita total em Closed Won: ${formatCurrencyBRL(totalRevenue)} | Negócios ativos: ${totalOpenDeals} | Tarefas em atraso: ${overdueTasks}`;

    const report = {
      title: 'Relatório de Análise de Pipeline',
      summary: summaryText,
      generatedAt: new Date().toISOString(),
    };

    let insightsHtml: string | null = null;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (geminiKey) {
      if (!process.env.API_KEY) {
        process.env.API_KEY = geminiKey;
      }
      try {
        insightsHtml = await generateAutomatedReport({
          report,
          salesData,
          dealData,
          churnPredictions,
          upsellOpportunities,
          totals: {
            totalRevenue,
            totalOpenDeals,
            overdueTasks,
            totalDeals: deals.length,
            totalTasks: tasks.length,
          },
        });
      } catch (geminiError: any) {
        console.warn('Falha ao gerar relatório com Gemini:', geminiError?.message ?? geminiError);
      }
    }

    response.status(200).json({
      report,
      churnPredictions,
      upsellOpportunities,
      salesData,
      dealData,
      insightsHtml,
    });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in analytics-data API:', error);
    response.status(status).json({ message });
  }
}

