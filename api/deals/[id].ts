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
  'Access-Control-Allow-Methods': 'GET,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const sanitizeUpdate = (body: any) => {
  const updates: Record<string, unknown> = {};

  if (body.companyName !== undefined) updates.company_name = body.companyName;
  if (body.contactName !== undefined) updates.contact_name = body.contactName;
  if (body.contactEmail !== undefined) updates.contact_email = body.contactEmail;
  if (body.value !== undefined) {
    const parsedValue = Number(body.value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      throw toHttpError(400, 'Campo value deve ser um número positivo.');
    }
    updates.value = parsedValue;
  }
  if (body.probability !== undefined) {
    const parsedProbability = Number(body.probability);
    if (!Number.isFinite(parsedProbability) || parsedProbability < 0 || parsedProbability > 100) {
      throw toHttpError(400, 'Campo probability deve estar entre 0 e 100.');
    }
    updates.probability = parsedProbability;
  }
  if (body.expectedCloseDate !== undefined) updates.expected_close_date = body.expectedCloseDate;
  if (body.lastActivity !== undefined) updates.last_activity = body.lastActivity;
  if (body.stage !== undefined) updates.stage = body.stage;
  if (body.empresaCnpj !== undefined) updates.empresa_cnpj = body.empresaCnpj;
  if (body.ownerId !== undefined) updates.owner_id = body.ownerId;
  if (body.health) {
    const { score, reasoning, suggestedAction } = body.health;
    if (score !== undefined) updates.health_score = score;
    if (reasoning !== undefined) updates.health_reasoning = reasoning;
    if (suggestedAction !== undefined) updates.health_suggested_action = suggestedAction;
  }

  if (Object.keys(updates).length === 0) {
    throw toHttpError(400, 'Nenhum campo válido informado para atualização.');
  }

  return updates;
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
    await requireUser(request, supabase);

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
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
      const updates = sanitizeUpdate(request.body ?? {});

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
