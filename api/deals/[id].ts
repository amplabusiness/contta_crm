import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_lib/auth.ts';
import { mapDealRecordToResponse } from '../utils/formatters.ts';

type NullableString = string | null;

interface DealRow extends Record<string, unknown> {
  id: string;
}

interface AuthenticatedUser {
  id: string;
}

interface DealHealthUpdate {
  score?: number;
  reasoning?: NullableString;
  suggestedAction?: NullableString;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isAuthenticatedUser = (value: unknown): value is AuthenticatedUser =>
  isRecord(value) && typeof value.id === 'string';

const normalizeDealRow = (value: unknown): DealRow | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  return { ...value, id: value.id } as DealRow;
};

const asNullableString = (value: unknown, field: string): NullableString => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw toHttpError(400, `Campo ${field} deve ser uma string.`);
};

const sanitizeHealthUpdate = (value: unknown): DealHealthUpdate => {
  if (!isRecord(value)) {
    throw toHttpError(400, 'Campo health deve ser um objeto.');
  }

  const updates: DealHealthUpdate = {};

  if (value.score !== undefined) {
    const parsedScore = Number(value.score);
    if (!Number.isFinite(parsedScore)) {
      throw toHttpError(400, 'Campo health.score deve ser numérico.');
    }
    updates.score = parsedScore;
  }

  if (value.reasoning !== undefined) {
    updates.reasoning = asNullableString(value.reasoning, 'health.reasoning');
  }

  if (value.suggestedAction !== undefined) {
    updates.suggestedAction = asNullableString(value.suggestedAction, 'health.suggestedAction');
  }

  return updates;
};

const sanitizeUpdate = (body: unknown) => {
  if (!isRecord(body)) {
    throw toHttpError(400, 'Corpo da requisição inválido.');
  }

  const updates: Record<string, unknown> = {};

  if (body.companyName !== undefined) {
    updates.company_name = asNullableString(body.companyName, 'companyName');
  }

  if (body.contactName !== undefined) {
    updates.contact_name = asNullableString(body.contactName, 'contactName');
  }

  if (body.contactEmail !== undefined) {
    updates.contact_email = asNullableString(body.contactEmail, 'contactEmail');
  }

  if (body.value !== undefined) {
    const parsedValue = Number(body.value ?? 0);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      throw toHttpError(400, 'Campo value deve ser um número positivo.');
    }
    updates.value = parsedValue;
  }

  if (body.probability !== undefined) {
    const parsedProbability = Number(body.probability ?? 0);
    if (!Number.isFinite(parsedProbability) || parsedProbability < 0 || parsedProbability > 100) {
      throw toHttpError(400, 'Campo probability deve estar entre 0 e 100.');
    }
    updates.probability = parsedProbability;
  }

  if (body.expectedCloseDate !== undefined) {
    updates.expected_close_date = asNullableString(body.expectedCloseDate, 'expectedCloseDate');
  }

  if (body.lastActivity !== undefined) {
    updates.last_activity = asNullableString(body.lastActivity, 'lastActivity');
  }

  if (body.stage !== undefined) {
    const stageValue = body.stage;
    if (stageValue === null) {
      updates.stage = null;
    } else if (typeof stageValue === 'string') {
      updates.stage = stageValue;
    } else {
      throw toHttpError(400, 'Campo stage deve ser uma string.');
    }
  }

  if (body.empresaCnpj !== undefined) {
    updates.empresa_cnpj = asNullableString(body.empresaCnpj, 'empresaCnpj');
  }

  if (body.ownerId !== undefined) {
    updates.owner_id = asNullableString(body.ownerId, 'ownerId');
  }

  if (body.health !== undefined && body.health !== null) {
    const healthUpdates = sanitizeHealthUpdate(body.health);
    if ('score' in healthUpdates && healthUpdates.score !== undefined) {
      updates.health_score = healthUpdates.score;
    }
    if ('reasoning' in healthUpdates && healthUpdates.reasoning !== undefined) {
      updates.health_reasoning = healthUpdates.reasoning;
    }
    if ('suggestedAction' in healthUpdates && healthUpdates.suggestedAction !== undefined) {
      updates.health_suggested_action = healthUpdates.suggestedAction;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw toHttpError(400, 'Nenhum campo válido informado para atualização.');
  }

  return updates;
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

  const { id } = request.query;
  const dealId = Array.isArray(id) ? id[0] : id;

  if (!dealId) {
    response.status(400).json({ message: 'ID do negócio inválido.' });
    return;
  }

  try {
    const user = await requireUser(request, supabase);
    if (!isAuthenticatedUser(user)) {
      throw toHttpError(500, 'Usuário autenticado inválido.');
    }

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const record = normalizeDealRow(data);

      if (!record) {
        throw toHttpError(404, 'Negócio não encontrado.');
      }

      response.status(200).json(mapDealRecordToResponse(record));
      return;
    }

    if (request.method === 'PATCH') {
      const updates = sanitizeUpdate(request.body as unknown);

      if (!updates.last_activity) {
        updates.last_activity = new Date().toISOString();
      }

      const { data, error, status } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', dealId)
        .select('*')
        .maybeSingle();

      if (error) {
        throw status === 406 ? toHttpError(404, 'Negócio não encontrado.') : error;
      }

      const updatedDeal = normalizeDealRow(data);

      if (!updatedDeal) {
        throw toHttpError(404, 'Negócio não encontrado.');
      }

      response.status(200).json(mapDealRecordToResponse(updatedDeal));
      return;
    }

    if (request.method === 'DELETE') {
      const { error, status } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) {
        throw status === 406 ? toHttpError(404, 'Negócio não encontrado.') : error;
      }

      response.status(204).end();
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: unknown) {
    const { status, message, original } = extractErrorDetails(rawError);
    console.error('Error in deals detail API:', original);
    response.status(status).json({ message });
  }
}
