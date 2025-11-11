import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface TaskDb {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  deal_id: string | null;
  related_deal_name: string | null;
  assignee_id: string | null;
  created_at: string;
}

interface TaskSummary {
  total: number;
  concluidas: number;
  emAndamento: number;
  pendentes: number;
  atrasadas: TaskDb[];
  semAssignee: TaskDb[];
  semDeal: TaskDb[];
}

function analyzeTasks(tasks: TaskDb[]): TaskSummary {
  const today = new Date().toISOString().split('T')[0];

  const summary: TaskSummary = {
    total: tasks.length,
    concluidas: 0,
    emAndamento: 0,
    pendentes: 0,
    atrasadas: [],
    semAssignee: [],
    semDeal: [],
  };

  for (const task of tasks) {
    if (task.status === 'Concluída') {
      summary.concluidas++;
    } else if (task.status === 'Em Andamento') {
      summary.emAndamento++;
    } else {
      summary.pendentes++;
    }

    if (task.due_date && task.due_date < today && task.status !== 'Concluída') {
      summary.atrasadas.push(task);
    }

    if (!task.assignee_id && task.status !== 'Concluída') {
      summary.semAssignee.push(task);
    }

    if (!task.deal_id && task.status !== 'Concluída') {
      summary.semDeal.push(task);
    }
  }

  return summary;
}

function serializeTasks(tasks: TaskDb[], limit: number) {
  return tasks.slice(0, limit).map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    priority: task.priority,
    status: task.status,
    deal_id: task.deal_id,
    related_deal_name: task.related_deal_name,
    assignee_id: task.assignee_id,
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, title, due_date, priority, status, deal_id, related_deal_name, assignee_id, created_at',
      )
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Erro ao buscar tarefas: ${error.message}`);
    }

    const tasks = (data || []) as TaskDb[];
    const summary = analyzeTasks(tasks);

    const responsePayload = {
      success: true,
      totals: {
        total: summary.total,
        concluidas: summary.concluidas,
        emAndamento: summary.emAndamento,
        pendentes: summary.pendentes,
      },
      alerts: {
        atrasadas: summary.atrasadas.length,
        semAssignee: summary.semAssignee.length,
        semDeal: summary.semDeal.length,
      },
      samples: {
        atrasadas: serializeTasks(summary.atrasadas, 10),
        semAssignee: serializeTasks(summary.semAssignee, 5),
        semDeal: serializeTasks(summary.semDeal, 5),
      },
      generatedAt: new Date().toISOString(),
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Erro no cron update-tasks:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
