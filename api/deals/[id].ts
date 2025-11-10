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
  'Access-Control-Allow-Methods': 'GET,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const withRelations = `
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
`;

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
    await requireUser(request, supabase);

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('deals')
        .select(withRelations)
        .eq('id', dealId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw toHttpError(404, 'Negócio não encontrado.');
      }

      response.status(200).json(mapDealRecordToResponse(data));
      return;
    }

    if (request.method === 'PATCH') {
      const updates = request.body ?? {};
      const mappedUpdates: Record<string, unknown> = {};

      if (updates.companyName !== undefined) {
        mappedUpdates.company_name = updates.companyName;
      }
      if (updates.contactName !== undefined) {
        mappedUpdates.contact_name = updates.contactName;
      }
      if (updates.contactEmail !== undefined) {
        mappedUpdates.contact_email = updates.contactEmail;
      }
      if (updates.value !== undefined) {
        mappedUpdates.value = updates.value;
      }
      if (updates.probability !== undefined) {
        mappedUpdates.probability = updates.probability;
      }
      if (updates.stage !== undefined) {
        mappedUpdates.stage = updates.stage;
      }
      if (updates.expectedCloseDate !== undefined) {
        mappedUpdates.expected_close_date = updates.expectedCloseDate;
      }
      if (updates.empresaCnpj !== undefined) {
        mappedUpdates.empresa_cnpj = updates.empresaCnpj;
      }
      if (updates.ownerId !== undefined) {
        mappedUpdates.owner_id = updates.ownerId;
      }
      if (updates.lastActivity !== undefined) {
        mappedUpdates.last_activity = updates.lastActivity;
      }
      if (updates.health !== undefined) {
        mappedUpdates.health_score = updates.health?.score ?? null;
        mappedUpdates.health_reasoning = updates.health?.reasoning ?? null;
        mappedUpdates.health_suggested_action = updates.health?.suggestedAction ?? null;
      }

      const { data, error, status } = await supabase
        .from('deals')
        .update(mappedUpdates)
        .eq('id', dealId)
        .select(withRelations)
        .maybeSingle();

      if (error) {
        throw status === 406 ? toHttpError(404, 'Negócio não encontrado.') : error;
      }

      if (!data) {
        throw toHttpError(404, 'Negócio não encontrado.');
      }

      response.status(200).json(mapDealRecordToResponse(data));
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
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in deals detail API:', error);
    response.status(status).json({ message });
  }
}
