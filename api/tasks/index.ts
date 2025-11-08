import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapTaskRecordToResponse } from '../utils/formatters';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
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

      const tasks = (data ?? []).map(mapTaskRecordToResponse);

      response.status(200).json(tasks);
    } else if (request.method === 'POST') {
      // Extrair os campos do corpo da requisição
      const {
        title,
        dueDate,
        priority,
        status,
        description,
        relatedDealId, // camelCase vindo do frontend
        assigneeId, // camelCase vindo do frontend
        googleCalendarEventId
      } = request.body;

      // Buscar o nome do negócio relacionado para desnormalização
      let relatedDealName = 'N/A';
      if (relatedDealId) {
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('company_name')
          .eq('id', relatedDealId)
          .single();
        if (dealError) {
          console.warn(`Aviso: Não foi possível encontrar o negócio ${relatedDealId} para a tarefa.`, dealError.message);
        } else {
          relatedDealName = dealData.company_name;
        }
      }

      // Montar o objeto para inserção no banco (snake_case)
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          due_date: dueDate,
          priority,
          status,
          description,
          deal_id: relatedDealId,
          related_deal_name: relatedDealName, // Armazenar o nome desnormalizado
          assignee_id: assigneeId,
          google_calendar_event_id: googleCalendarEventId
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      response.status(201).json(mapTaskRecordToResponse(data));
    } else {
      response.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in tasks API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

