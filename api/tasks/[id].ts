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
  'Access-Control-Allow-Methods': 'GET,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const withRelations = `
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
`;

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

  const { id } = request.query;
  const taskId = Array.isArray(id) ? id[0] : id;

  if (!taskId) {
    response.status(400).json({ message: 'ID da tarefa inválido.' });
    return;
  }

  try {
    await requireUser(request, supabase);

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('tasks')
        .select(withRelations)
        .eq('id', taskId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw toHttpError(404, 'Tarefa não encontrada.');
      }

      response.status(200).json(mapTaskRecordToResponse(data));
      return;
    }

    if (request.method === 'PATCH') {
      const updates = request.body ?? {};
      const dbUpdates: Record<string, unknown> = {};

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.relatedDealId !== undefined) dbUpdates.deal_id = updates.relatedDealId;
      if (updates.googleCalendarEventId !== undefined) {
        dbUpdates.google_calendar_event_id = updates.googleCalendarEventId;
      }

      if (updates.relatedDealId !== undefined) {
        dbUpdates.related_deal_name = await resolveRelatedDealName(updates.relatedDealId);
      }

      const { data, error, status } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .select(withRelations)
        .maybeSingle();

      if (error) {
        throw status === 406 ? toHttpError(404, 'Tarefa não encontrada.') : error;
      }

      if (!data) {
        throw toHttpError(404, 'Tarefa não encontrada.');
      }

      response.status(200).json(mapTaskRecordToResponse(data));
      return;
    }

    if (request.method === 'DELETE') {
      const { error, status } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        throw status === 406 ? toHttpError(404, 'Tarefa não encontrada.') : error;
      }

      response.status(204).end();
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in task detail API:', error);
    response.status(status).json({ message });
  }
}
