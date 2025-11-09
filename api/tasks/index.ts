import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_lib/auth.ts';
import { mapTaskRecordToResponse } from '../utils/formatters.ts';

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

const resolveRelatedDealName = async (dealId?: string | null): Promise<string> => {
  if (!dealId) {
    return 'N/A';
  }

  const { data, error } = await supabase
    .from('deals')
    .select('company_name')
    .eq('id', dealId)
    .maybeSingle();

  if (error) {
    console.warn(`Não foi possível encontrar o negócio ${dealId} para a tarefa: ${error.message}`);
    return 'N/A';
  }

  return data?.company_name ?? 'N/A';
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
        .from('tasks')
        .select(`
          *,
          deals:deal_id (
            id,
            company_name
          ),
          profiles:assignee_id (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      response.status(200).json((data ?? []).map(mapTaskRecordToResponse));
      return;
    }

    if (request.method === 'POST') {
      const {
        title,
        dueDate,
        priority,
        status,
        description,
        relatedDealId,
        assigneeId,
        googleCalendarEventId,
      } = request.body ?? {};

      if (!title || typeof title !== 'string') {
        throw toHttpError(400, 'Campo title é obrigatório.');
      }

      const relatedDealName = await resolveRelatedDealName(relatedDealId);

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          due_date: dueDate ?? null,
          priority,
          status,
          description: description ?? null,
          deal_id: relatedDealId ?? null,
          related_deal_name: relatedDealName,
          assignee_id: assigneeId ?? null,
          google_calendar_event_id: googleCalendarEventId ?? null,
        })
        .select(`
          *,
          deals:deal_id (
            id,
            company_name
          ),
          profiles:assignee_id (
            id,
            name,
            email
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      response.status(201).json(mapTaskRecordToResponse(data));
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in tasks API:', error);
    response.status(status).json({ message });
  }
}

