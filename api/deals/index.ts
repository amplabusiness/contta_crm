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

interface DealInsertRequest {
  companyName: string;
  contactName: NullableString;
  contactEmail: NullableString;
  value: number;
  probability: number;
  expectedCloseDate: NullableString;
  stage: string;
  empresaCnpj: NullableString;
  ownerId: NullableString;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

const asNullableString = (value: unknown, fieldName: string): NullableString => {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw toHttpError(400, `Campo ${fieldName} deve ser uma string.`);
};

const asStage = (value: unknown): string => {
  if (value === undefined || value === null) {
    return 'Prospecting';
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  throw toHttpError(400, 'Campo stage deve ser uma string.');
};

const parseDealInsertBody = (payload: unknown): DealInsertRequest => {
  if (!isRecord(payload)) {
    throw toHttpError(400, 'Corpo da requisição inválido.');
  }

  const companyName = payload.companyName;
  if (typeof companyName !== 'string' || !companyName.trim()) {
    throw toHttpError(400, 'Campo companyName é obrigatório.');
  }

  const value = Number(payload.value ?? 0);
  if (!Number.isFinite(value) || value < 0) {
    throw toHttpError(400, 'Campo value deve ser um número positivo.');
  }

  const probability = Number(payload.probability ?? 0);
  if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
    throw toHttpError(400, 'Campo probability deve estar entre 0 e 100.');
  }

  const expectedCloseDateRaw = payload.expectedCloseDate;
  if (
    expectedCloseDateRaw !== undefined &&
    expectedCloseDateRaw !== null &&
    typeof expectedCloseDateRaw !== 'string'
  ) {
    throw toHttpError(400, 'Campo expectedCloseDate deve ser uma string.');
  }
  const expectedCloseDate = typeof expectedCloseDateRaw === 'string' ? expectedCloseDateRaw : null;

  const ownerIdRaw = payload.ownerId;
  if (ownerIdRaw !== undefined && ownerIdRaw !== null && typeof ownerIdRaw !== 'string') {
    throw toHttpError(400, 'Campo ownerId deve ser uma string.');
  }
  const ownerId = typeof ownerIdRaw === 'string' ? ownerIdRaw : null;

  return {
    companyName,
    contactName: asNullableString(payload.contactName, 'contactName'),
    contactEmail: asNullableString(payload.contactEmail, 'contactEmail'),
    value,
    probability,
    expectedCloseDate,
    stage: asStage(payload.stage),
    empresaCnpj: asNullableString(payload.empresaCnpj, 'empresaCnpj'),
    ownerId,
  };
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

  try {
    const userCandidate = await requireUser(request, supabase);
    if (!isAuthenticatedUser(userCandidate)) {
      throw toHttpError(500, 'Usuário autenticado inválido.');
    }
    const user = userCandidate;

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const deals = ((data ?? []) as unknown[])
        .map(normalizeDealRow)
        .filter((deal): deal is DealRow => deal !== null)
        .map(mapDealRecordToResponse);

      response.status(200).json(deals);
      return;
    }

    if (request.method === 'POST') {
      const insertBody = parseDealInsertBody(request.body as unknown);

      const payload = {
        company_name: insertBody.companyName,
        contact_name: insertBody.contactName,
        contact_email: insertBody.contactEmail,
        value: insertBody.value,
        probability: insertBody.probability,
        expected_close_date: insertBody.expectedCloseDate,
        stage: insertBody.stage,
        empresa_cnpj: insertBody.empresaCnpj,
        owner_id: insertBody.ownerId ?? user.id,
        last_activity: new Date().toISOString(),
      } as const;

      const { data, error } = await supabase
        .from('deals')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const newDeal = normalizeDealRow(data);
      if (!newDeal) {
        throw toHttpError(500, 'Resposta inválida ao criar negócio.');
      }

      response.status(201).json(mapDealRecordToResponse(newDeal));
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: unknown) {
    const { status, message, original } = extractErrorDetails(rawError);
    console.error('Error in deals API:', original);
    response.status(status).json({ message });
  }
}
