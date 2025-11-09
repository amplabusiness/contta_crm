import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requireUser } from './_lib/auth.ts';

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const mapDealRecord = (deal: any) => ({
  id: deal.id,
  companyName: deal.company_name,
  contactName: deal.contact_name ?? '',
  contactEmail: deal.contact_email ?? '',
  value: typeof deal.value === 'number' ? deal.value : Number(deal.value ?? 0),
  probability: deal.probability ?? 0,
  expectedCloseDate: deal.expected_close_date,
  lastActivity: deal.last_activity,
  stage: deal.stage,
  health: deal.health_score
    ? {
        score: deal.health_score,
        reasoning: deal.health_reasoning ?? '',
        suggestedAction: deal.health_suggested_action ?? '',
      }
    : null,
  createdAt: deal.created_at ?? null,
});

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

      const deals = (data ?? []).map(mapDealRecord);
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
      };

      const { data, error } = await supabase
        .from('deals')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      response.status(201).json(mapDealRecord(data));
      return;
    }

    if (request.method === 'PATCH') {
      const { id } = request.query;
      if (!id || Array.isArray(id)) {
        throw toHttpError(400, 'ID do negócio inválido.');
      }

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
      if (updates.health !== undefined) {
        mappedUpdates.health_score = updates.health?.score ?? null;
        mappedUpdates.health_reasoning = updates.health?.reasoning ?? null;
        mappedUpdates.health_suggested_action = updates.health?.suggestedAction ?? null;
      }

      const { data, error, status } = await supabase
        .from('deals')
        .update(mappedUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw status === 406 ? toHttpError(404, 'Negócio não encontrado.') : error;
      }

      if (!data) {
        throw toHttpError(404, 'Negócio não encontrado.');
      }

      response.status(200).json(mapDealRecord(data));
      return;
    }

    if (request.method === 'DELETE') {
      const { id } = request.query;
      if (!id || Array.isArray(id)) {
        throw toHttpError(400, 'ID do negócio inválido.');
      }

      const { error, status } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

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
    console.error('Error in deals API:', error);
    response.status(status).json({ message });
  }
}

