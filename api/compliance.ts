import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type NullableString = string | null;

interface ProfileRecord {
  id: string;
  name: NullableString;
  email: NullableString;
  status: NullableString;
  last_login: NullableString;
}

type RelationshipProfile = ProfileRecord | ProfileRecord[] | null;

interface TaskRecord {
  id: string;
  title: NullableString;
  status: NullableString;
  related_deal_name: NullableString;
  created_at: NullableString;
  due_date: NullableString;
  profiles: RelationshipProfile;
}

interface DealRecord {
  id: string;
  company_name: NullableString;
  stage: NullableString;
  last_activity: NullableString;
  created_at: NullableString;
  profiles: RelationshipProfile;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asNullableString = (value: unknown): NullableString =>
  typeof value === 'string' ? value : null;

const normalizeProfile = (value: unknown): ProfileRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  if (!id) {
    return null;
  }

  return {
    id,
    name: asNullableString(value.name),
    email: asNullableString(value.email),
    status: asNullableString(value.status),
    last_login: asNullableString(value.last_login),
  };
};

const normalizeRelationship = (value: unknown): RelationshipProfile => {
  if (Array.isArray(value)) {
    const normalized = value
      .map(normalizeProfile)
      .filter((profile): profile is ProfileRecord => profile !== null);

    return normalized.length > 0 ? normalized : null;
  }

  const profile = normalizeProfile(value);
  return profile ?? null;
};

const normalizeTask = (value: unknown): TaskRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  if (!id) {
    return null;
  }

  return {
    id,
    title: asNullableString(value.title),
    status: asNullableString(value.status),
    related_deal_name: asNullableString(value.related_deal_name),
    created_at: asNullableString(value.created_at),
    due_date: asNullableString(value.due_date),
    profiles: normalizeRelationship(value.profiles),
  };
};

const normalizeDeal = (value: unknown): DealRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  if (!id) {
    return null;
  }

  return {
    id,
    company_name: asNullableString(value.company_name),
    stage: asNullableString(value.stage),
    last_activity: asNullableString(value.last_activity),
    created_at: asNullableString(value.created_at),
    profiles: normalizeRelationship(value.profiles),
  };
};

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

const formatTimestamp = (value: unknown): string => {
  if (typeof value === 'string' || value instanceof Date) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
  }
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const resolveProfileName = (profileRelation: RelationshipProfile): string | null => {
  if (!profileRelation) {
    return null;
  }
  if (Array.isArray(profileRelation)) {
    return profileRelation[0]?.name ?? null;
  }
  return profileRelation.name ?? null;
};

const extractErrorDetails = (
  error: unknown,
): { status: number; message: string; original: unknown } => {
  if (error instanceof Error) {
    const status = isRecord(error) && typeof error.status === 'number' ? error.status : 500;
    return { status, message: error.message, original: error };
  }

  if (isRecord(error)) {
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = typeof error.message === 'string' ? error.message : 'Internal server error';
    return { status, message, original: error };
  }

  return { status: 500, message: 'Internal server error', original: error };
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

    const profiles = ((profilesResult.data ?? []) as unknown[])
      .map(normalizeProfile)
      .filter((profile): profile is ProfileRecord => profile !== null);

    const tasks = ((tasksResult.data ?? []) as unknown[])
      .map(normalizeTask)
      .filter((task): task is TaskRecord => task !== null);

    const deals = ((dealsResult.data ?? []) as unknown[])
      .map(normalizeDeal)
      .filter((deal): deal is DealRecord => deal !== null);
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
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        user: resolveProfileName(task.profiles) ?? 'Equipe Contábil',
        action: task.status === 'Concluída' ? 'modified' : 'viewed',
        target: task.title ?? 'Tarefa',
        timestamp: formatTimestamp(task.created_at ?? task.due_date),
      })),
      ...deals.map((deal) => ({
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
  } catch (rawError: unknown) {
    const { status, message, original } = extractErrorDetails(rawError);
    console.error('Error in compliance API:', original);
    response.status(status).json({ message });
  }
}
