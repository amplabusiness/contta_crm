import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

const defaultConsentText = [
  '✅ Uso de dados para análise de performance.',
  '✅ Comunicação sobre novos serviços e recursos relevantes.',
  '✅ Compartilhamento com provedores essenciais (armazenamento, análise).',
  '❌ Comercialização de dados pessoais com terceiros.',
].join('\n');

const formatTimestamp = (value: unknown) => {
  if (typeof value === 'string' || value instanceof Date) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
  }
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const resolveProfileName = (profileRelation: any): string | null => {
  if (!profileRelation) {
    return null;
  }
  if (Array.isArray(profileRelation)) {
    return profileRelation[0]?.name ?? null;
  }
  return profileRelation.name ?? null;
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
    const [profilesResult, tasksResult, dealsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, status, last_login')
        .order('last_login', { ascending: false }),
      supabase
        .from('tasks')
        .select(
          `
          id,
          title,
          status,
          related_deal_name,
          created_at,
          due_date,
          profiles:assignee_id (
            id,
            name,
            email
          )
        `,
        )
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('deals')
        .select(
          `
          id,
          company_name,
          stage,
          last_activity,
          created_at,
          profiles:owner_id (
            id,
            name,
            email
          )
        `,
        )
        .order('last_activity', { ascending: false })
        .limit(40),
    ]);

    if (profilesResult.error) {
      throw profilesResult.error;
    }
    if (tasksResult.error) {
      throw tasksResult.error;
    }
    if (dealsResult.error) {
      throw dealsResult.error;
    }

    const profiles = profilesResult.data ?? [];
    const totalUsers = profiles.length;
    const consentedUsers = profiles.filter((profile) =>
      (profile.status ?? '').toLowerCase() === 'ativo',
    ).length;

    const consentStatus = {
      totalUsers,
      consentedUsers,
      consentText: defaultConsentText,
    };

    const accessLogs = [
      ...(tasksResult.data ?? []).map((task) => ({
        id: `task-${task.id}`,
        user: resolveProfileName(task.profiles) ?? 'Equipe Contábil',
        action: task.status === 'Concluída' ? 'modified' : 'viewed',
        target: task.title ?? 'Tarefa',
        timestamp: formatTimestamp(task.created_at ?? task.due_date),
      })),
      ...(dealsResult.data ?? []).map((deal) => ({
        id: `deal-${deal.id}`,
        user: resolveProfileName(deal.profiles) ?? 'Gestor Comercial',
        action: deal.stage === 'Closed Won' ? 'exported' : 'viewed',
        target: deal.company_name ?? 'Negócio',
        timestamp: formatTimestamp(deal.last_activity ?? deal.created_at),
      })),
    ]
      .filter((log) => Boolean(log.timestamp))
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      })
      .slice(0, 60);

    response.status(200).json({ consentStatus, accessLogs });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in compliance API:', error);
    response.status(status).json({ message });
  }
}
