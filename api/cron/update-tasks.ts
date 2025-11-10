import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Vercel Cron Job: Relatório semanal de tarefas
 * 
 * Schedule: 0 8 * * 1 (segundas-feiras às 8h AM)
 * 
 * Executa análise de tarefas atrasadas, sem assignee e sem deal vinculado
 */

interface Task {
  id: string;
  title: string;
  status: string;
  due_date?: string;
  assignee_id?: string;
  deal_id?: string;
}

interface AlertItem {
  id: string;
  title: string;
  issue: string;
  details: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validar segurança
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Buscar todas as tarefas
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma tarefa encontrada',
        stats: {},
      });
    }

    // Analisar tarefas
    const now = new Date();
    const alerts: AlertItem[] = [];
    const stats = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0,
      noAssignee: 0,
      noDeal: 0,
    };

    tasks.forEach((task: Task) => {
      // Contar por status
      if (task.status === 'concluido') stats.completed++;
      else if (task.status === 'em_andamento') stats.inProgress++;
      else stats.pending++;

      // Verificar atrasos críticos (> 30 dias)
      if (task.due_date && task.status !== 'concluido') {
        const dueDate = new Date(task.due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue > 30) {
          stats.overdue++;
          alerts.push({
            id: task.id,
            title: task.title,
            issue: 'overdue',
            details: `${daysOverdue} dias atrasada`,
          });
        }
      }

      // Verificar sem assignee
      if (!task.assignee_id) {
        stats.noAssignee++;
        alerts.push({
          id: task.id,
          title: task.title,
          issue: 'no_assignee',
          details: 'Sem responsável atribuído',
        });
      }

      // Verificar sem deal
      if (!task.deal_id) {
        stats.noDeal++;
        alerts.push({
          id: task.id,
          title: task.title,
          issue: 'no_deal',
          details: 'Sem negócio vinculado',
        });
      }
    });

    // Calcular score
    const totalIssues = stats.overdue + stats.noAssignee + stats.noDeal;
    const score = Math.max(0, Math.round(((stats.total - totalIssues) / stats.total) * 100));

    return res.status(200).json({
      success: true,
      message: 'Análise semanal concluída',
      score,
      stats: {
        ...stats,
        completedPercent: ((stats.completed / stats.total) * 100).toFixed(1),
        inProgressPercent: ((stats.inProgress / stats.total) * 100).toFixed(1),
        pendingPercent: ((stats.pending / stats.total) * 100).toFixed(1),
      },
      alerts: alerts.slice(0, 10), // Top 10 alertas
    });
  } catch (error) {
    console.error('Erro no cron update-tasks:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
