import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_lib/auth.ts';
import { mapDealRecordToResponse } from '../utils/formatters.ts';

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
    const user = await requireUser(request, supabase);

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      response.status(200).json((data ?? []).map(mapDealRecordToResponse));
      return;
    }

    if (request.method === 'POST') {
      const {
        companyName,
        contactName,
        contactEmail,
        value,
        probability,
        expectedCloseDate,
        stage,
        empresaCnpj,
        ownerId,
      } = request.body ?? {};

      if (!companyName || typeof companyName !== 'string') {
        throw toHttpError(400, 'Campo companyName é obrigatório.');
      }

      const parsedValue = Number(value ?? 0);
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw toHttpError(400, 'Campo value deve ser um número positivo.');
      }

      const parsedProbability = Number(probability ?? 0);
      if (!Number.isFinite(parsedProbability) || parsedProbability < 0 || parsedProbability > 100) {
        throw toHttpError(400, 'Campo probability deve estar entre 0 e 100.');
      }

      const payload = {
        company_name: companyName,
        contact_name: contactName ?? null,
        contact_email: contactEmail ?? null,
        value: parsedValue,
        probability: parsedProbability,
        expected_close_date: expectedCloseDate ?? null,
        stage: stage ?? 'Prospecting',
        empresa_cnpj: empresaCnpj ?? null,
        owner_id: ownerId ?? user.id,
        last_activity: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('deals')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      response.status(201).json(mapDealRecordToResponse(data));
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in deals API:', error);
    response.status(status).json({ message });
  }
}
