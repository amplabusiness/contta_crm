import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapTaskRecordToResponse } from '../utils/formatters';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

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

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  const { id } = request.query;
  const taskId = Array.isArray(id) ? id[0] : id;

  if (!taskId) {
    response.status(400).json({ message: 'ID da tarefa inválido.' });
    return;
  }

  try {
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
        response.status(404).json({ message: 'Tarefa não encontrada.' });
        return;
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

      if (updates.relatedDealId) {
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('company_name')
          .eq('id', updates.relatedDealId)
          .maybeSingle();

        if (dealError) {
          console.warn(`Aviso: Não foi possível encontrar o negócio ${updates.relatedDealId} para a tarefa.`, dealError.message);
          dbUpdates.related_deal_name = 'N/A';
        } else if (dealData?.company_name) {
          dbUpdates.related_deal_name = dealData.company_name;
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .select(withRelations)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        response.status(404).json({ message: 'Tarefa não encontrada.' });
        return;
      }

      response.status(200).json(mapTaskRecordToResponse(data));
      return;
    }

    if (request.method === 'DELETE') {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      response.status(204).end();
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('Error in task detail API:', err);
    response.status(500).json({ message: err.message ?? 'Internal server error' });
  }
}
