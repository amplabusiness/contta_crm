import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireUser } from '../_lib/auth.ts';
import { mapDealRecordToResponse } from '../utils/formatters.ts';

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

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
    await requireUser(request, supabase);

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('deals')
        .select(
          `
          *,
          empresas:empresa_cnpj (
            cnpj,
            razao_social,
            nome_fantasia
          ),
          profiles:owner_id (
            id,
            name,
            email
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const deals = (data ?? []).map(mapDealRecordToResponse);
      response.status(200).json(deals);
      return;
    }

    if (request.method === 'POST') {
      const {
        companyName,
        contactName,
        contactEmail,
        value,
        probability,
        stage,
        expectedCloseDate,
        empresaCnpj,
        ownerId,
        lastActivity,
        health,
      } = request.body ?? {};

      if (!companyName || typeof companyName !== 'string') {
        throw toHttpError(400, 'Campo companyName é obrigatório.');
      }

      const payload = {
        company_name: companyName,
        contact_name: contactName ?? null,
        contact_email: contactEmail ?? null,
        value,
        probability: probability ?? 0,
        stage,
        expected_close_date: expectedCloseDate ?? null,
        empresa_cnpj: empresaCnpj ?? null,
        owner_id: ownerId ?? null,
        last_activity: lastActivity ?? null,
        health_score: health?.score ?? null,
        health_reasoning: health?.reasoning ?? null,
        health_suggested_action: health?.suggestedAction ?? null,
      };

      const { data, error } = await supabase
        .from('deals')
        .insert(payload)
        .select(
          `
          *,
          empresas:empresa_cnpj (
            cnpj,
            razao_social,
            nome_fantasia
          ),
          profiles:owner_id (
            id,
            name,
            email
          )
        `,
        )
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
