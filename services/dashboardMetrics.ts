import type { DealStageData, RecentActivity, SalesData } from '../types.ts';

export interface DashboardStatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
}

export interface DealRecord {
  id: string;
  company_name?: string | null;
  value?: number | string | null;
  stage?: string | null;
  probability?: number | string | null;
  expected_close_date?: string | null;
  last_activity?: string | null;
  created_at?: string | null;
}

export interface TaskRecord {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  related_deal_name?: string | null;
  created_at?: string | null;
}

export interface DashboardMetrics {
  statCardsData: DashboardStatCard[];
  salesChartData: SalesData[];
  dealStageData: DealStageData[];
  recentActivities: RecentActivity[];
}

const ensureNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const formatCurrencyBRL = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);

const normalizeStage = (stage: unknown): string => (typeof stage === 'string' ? stage : '');

const buildSalesTimeline = (deals: DealRecord[], months = 6): SalesData[] => {
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
    if (normalizeStage(deal.stage) === 'Closed Won') {
      timeline[key].revenue += ensureNumber(deal.value);
    }
  });

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      name: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      }),
      sales: value.sales,
      revenue: value.revenue,
    }));
};

const buildDealStageData = (deals: DealRecord[]): DealStageData[] => {
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
    value: deals.filter((deal) => normalizeStage(deal.stage) === name).length,
  }));
};

const buildRecentActivities = (
  deals: DealRecord[],
  tasks: TaskRecord[],
  limit = 10,
): RecentActivity[] => {
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
      action: `Negócio ${normalizeStage(deal.stage) || 'Atualizado'}`,
      target: deal.company_name ?? 'Negócio',
      timestamp: deal.created_at ?? new Date().toISOString(),
    })),
  ]
    .filter((entry) => Boolean(entry.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, limit);
};

export const computeDashboardMetrics = (
  deals: DealRecord[],
  tasks: TaskRecord[],
): DashboardMetrics => {
  const normalizedDeals = deals ?? [];
  const normalizedTasks = tasks ?? [];

  const closedWonDeals = normalizedDeals.filter(
    (deal) => normalizeStage(deal.stage) === 'Closed Won',
  );
  const totalRevenue = closedWonDeals.reduce(
    (acc, deal) => acc + ensureNumber(deal.value),
    0,
  );
  const totalDeals = normalizedDeals.length;
  const activeDeals = normalizedDeals.filter(
    (deal) => !['Closed Won', 'Closed Lost'].includes(normalizeStage(deal.stage)),
  ).length;
  const pendingTasks = normalizedTasks.filter((task) => task.status === 'A Fazer').length;

  const conversionRate = totalDeals > 0
    ? Math.round((closedWonDeals.length / totalDeals) * 100)
    : 0;

  const statCardsData: DashboardStatCard[] = [
    {
      title: 'Receita Total',
      value: formatCurrencyBRL(totalRevenue),
      change: '+0%',
      changeType: 'increase',
    },
    {
      title: 'Negócios Ativos',
      value: String(activeDeals),
      change: '+0',
      changeType: 'increase',
    },
    {
      title: 'Tarefas Pendentes',
      value: String(pendingTasks),
      change: '+0',
      changeType: 'decrease',
    },
    {
      title: 'Taxa de Conversão',
      value: `${conversionRate}%`,
      change: '+0%',
      changeType: 'increase',
    },
  ];

  return {
    statCardsData,
    salesChartData: buildSalesTimeline(normalizedDeals),
    dealStageData: buildDealStageData(normalizedDeals),
    recentActivities: buildRecentActivities(
      normalizedDeals.slice(0, 20),
      normalizedTasks.slice(0, 20),
    ),
  };
};
