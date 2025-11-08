import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

      // Transformar dados para o formato esperado pelo frontend
      const tasks = data?.map(task => {
        // O nome do negócio relacionado pode vir de duas fontes
        const relatedDealName = task.related_deal_name || task.deals?.company_name || 'N/A';

        return {
          id: task.id,
          title: task.title,
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          description: task.description,
          googleCalendarEventId: task.google_calendar_event_id,
          relatedDealId: task.deal_id || '',
          relatedDealName: relatedDealName,
          createdAt: task.created_at
        };
      }) || [];

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

      // Retornar o dado criado (já no formato do banco, precisa transformar)
      response.status(201).json({
          id: data.id,
          title: data.title,
          dueDate: data.due_date,
          priority: data.priority,
          status: data.status,
          description: data.description,
          googleCalendarEventId: data.google_calendar_event_id,
          relatedDealId: data.deal_id,
          relatedDealName: data.related_deal_name,
          createdAt: data.created_at
      });
    } else if (request.method === 'PATCH') {
      const { id } = request.query;
      if (!id || Array.isArray(id)) {
        return response.status(400).json({ message: 'ID da tarefa inválido.' });
      }
      const updates = request.body;

      // Mapear campos do frontend (camelCase) para o banco (snake_case)
      const dbUpdates: { [key: string]: any } = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.relatedDealId !== undefined) dbUpdates.deal_id = updates.relatedDealId;
      
      // Se o ID do negócio for alterado, buscar o novo nome
      if (updates.relatedDealId) {
         const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('company_name')
          .eq('id', updates.relatedDealId)
          .single();
        if (dealError) {
           console.warn(`Aviso: Não foi possível encontrar o novo negócio ${updates.relatedDealId} para a tarefa.`, dealError.message);
           dbUpdates.related_deal_name = 'N/A';
        } else {
           dbUpdates.related_deal_name = dealData.company_name;
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Retornar o dado atualizado (já no formato do banco, precisa transformar)
      response.status(200).json({
          id: data.id,
          title: data.title,
          dueDate: data.due_date,
          priority: data.priority,
          status: data.status,
          description: data.description,
          googleCalendarEventId: data.google_calendar_event_id,
          relatedDealId: data.deal_id,
          relatedDealName: data.related_deal_name,
          createdAt: data.created_at
      });
    } else {
      response.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in tasks API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

