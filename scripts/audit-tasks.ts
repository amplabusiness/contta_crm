#!/usr/bin/env tsx
/**
 * Script de Auditoria de Tarefas (Tasks)
 * 
 * Objetivo: Validar integridade e qualidade dos dados da tabela tasks.
 * 
 * Validações:
 *   - Tasks atrasadas > 30 dias
 *   - Tasks sem assignee (responsável)
 *   - Tasks sem deal vinculado
 *   - Duplicatas por título
 *   - Tasks sem data de vencimento
 *   - Tasks concluídas sem data de conclusão
 * 
 * Uso:
 *   npx tsx scripts/audit-tasks.ts
 * 
 * @author Contta CRM Team
 * @date 2025-11-10
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

interface TaskDB {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  description: string | null;
  deal_id: string | null;
  related_deal_name: string | null;
  assignee_id: string | null;
  created_at: string;
}

interface AuditReport {
  total: number;
  healthy: number;
  issues: {
    atrasadas30Dias: TaskDB[];
    semAssignee: TaskDB[];
    semDeal: TaskDB[];
    duplicatas: Array<{ title: string; count: number; tasks: TaskDB[] }>;
    semDueDate: TaskDB[];
  };
  score: number;
}

/**
 * Busca todas as tasks
 */
async function fetchAllTasks(): Promise<TaskDB[]> {
  console.log('🔍 Buscando todas as tarefas...');

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar tasks:', error.message);
    throw error;
  }

  console.log(`✅ Encontradas ${data.length} tarefas\n`);
  return data as TaskDB[];
}

/**
 * Audita tasks e identifica problemas
 */
function auditTasks(tasks: TaskDB[]): AuditReport {
  const report: AuditReport = {
    total: tasks.length,
    healthy: 0,
    issues: {
      atrasadas30Dias: [],
      semAssignee: [],
      semDeal: [],
      duplicatas: [],
      semDueDate: [],
    },
    score: 0,
  };

  const now = new Date();
  const threshold30Days = new Date();
  threshold30Days.setDate(threshold30Days.getDate() - 30);

  // Map para detectar duplicatas
  const titleMap = new Map<string, TaskDB[]>();

  for (const task of tasks) {
    let hasIssue = false;

    // 1. Tarefas atrasadas > 30 dias
    if (task.due_date && new Date(task.due_date) < threshold30Days && task.status !== 'Concluída') {
      report.issues.atrasadas30Dias.push(task);
      hasIssue = true;
    }

    // 2. Tarefas sem assignee (não concluídas)
    if (!task.assignee_id && task.status !== 'Concluída') {
      report.issues.semAssignee.push(task);
      hasIssue = true;
    }

    // 3. Tarefas sem deal vinculado
    if (!task.deal_id) {
      report.issues.semDeal.push(task);
      hasIssue = true;
    }

    // 4. Tarefas sem data de vencimento (não concluídas)
    if (!task.due_date && task.status !== 'Concluída') {
      report.issues.semDueDate.push(task);
      hasIssue = true;
    }

    // 5. Detectar duplicatas por título
    const normalizedTitle = task.title.trim().toLowerCase();
    if (!titleMap.has(normalizedTitle)) {
      titleMap.set(normalizedTitle, []);
    }
    titleMap.get(normalizedTitle)!.push(task);

    if (!hasIssue) {
      report.healthy++;
    }
  }

  // Processar duplicatas
  titleMap.forEach((tasks, title) => {
    if (tasks.length > 1) {
      report.issues.duplicatas.push({
        title,
        count: tasks.length,
        tasks,
      });
    }
  });

  // Calcular score de qualidade (0-100)
  const totalIssues = 
    report.issues.atrasadas30Dias.length +
    report.issues.semAssignee.length +
    report.issues.semDeal.length +
    report.issues.semDueDate.length +
    (report.issues.duplicatas.length * 2); // Duplicatas pesam mais

  report.score = Math.max(0, Math.round(((report.total - totalIssues) / report.total) * 100));

  return report;
}

/**
 * Exibe relatório de auditoria
 */
function printReport(report: AuditReport) {
  console.log('='.repeat(70));
  console.log('🔍 RELATÓRIO DE AUDITORIA - TAREFAS (TASKS)');
  console.log('='.repeat(70));

  // Score de qualidade
  const scoreEmoji = report.score >= 80 ? '🟢' : report.score >= 50 ? '🟡' : '🔴';
  console.log(`\n${scoreEmoji} Score de Qualidade: ${report.score}/100`);
  console.log(`   Total de tarefas: ${report.total}`);
  console.log(`   ✅ Saudáveis: ${report.healthy} (${((report.healthy / report.total) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️ Com problemas: ${report.total - report.healthy} (${(((report.total - report.healthy) / report.total) * 100).toFixed(1)}%)`);

  // Detalhamento dos problemas
  console.log(`\n📊 Detalhamento dos Problemas:`);
  console.log('─'.repeat(70));

  const problems = [
    { key: 'atrasadas30Dias', label: '⏰ Atrasadas > 30 dias', critical: true },
    { key: 'semAssignee', label: '👤 Sem responsável', critical: true },
    { key: 'semDeal', label: '💼 Sem deal vinculado', critical: false },
    { key: 'semDueDate', label: '📅 Sem data de vencimento', critical: false },
    { key: 'duplicatas', label: '🔁 Duplicatas detectadas', critical: false },
  ];

  problems.forEach(({ key, label, critical }) => {
    const count = key === 'duplicatas' 
      ? report.issues.duplicatas.length 
      : report.issues[key as keyof typeof report.issues].length;
    const icon = critical && count > 0 ? '🔴' : count > 0 ? '⚠️' : '✅';
    console.log(`   ${icon} ${label}: ${count}`);
  });

  // Listar tasks com problemas críticos
  if (report.issues.atrasadas30Dias.length > 0) {
    console.log(`\n⏰ TAREFAS ATRASADAS > 30 DIAS (${report.issues.atrasadas30Dias.length}):`);
    console.log('─'.repeat(70));
    report.issues.atrasadas30Dias.slice(0, 5).forEach((task, idx) => {
      const daysLate = Math.floor(
        (new Date().getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`   ${idx + 1}. ${task.title}`);
      console.log(`      📅 Vencimento: ${task.due_date} (${daysLate} dias atrasada)`);
      console.log(`      🎯 Prioridade: ${task.priority} | Status: ${task.status}`);
      console.log(`      💼 Deal: ${task.related_deal_name || 'N/A'}`);
      console.log('');
    });
    if (report.issues.atrasadas30Dias.length > 5) {
      console.log(`   ... e mais ${report.issues.atrasadas30Dias.length - 5} tarefas atrasadas`);
    }
  }

  if (report.issues.semAssignee.length > 0) {
    console.log(`\n👤 TAREFAS SEM RESPONSÁVEL (${report.issues.semAssignee.length}):`);
    console.log('─'.repeat(70));
    report.issues.semAssignee.slice(0, 5).forEach((task, idx) => {
      console.log(`   ${idx + 1}. ${task.title}`);
      console.log(`      📅 Vencimento: ${task.due_date || 'Não definido'}`);
      console.log(`      🎯 Prioridade: ${task.priority} | Status: ${task.status}`);
      console.log('');
    });
    if (report.issues.semAssignee.length > 5) {
      console.log(`   ... e mais ${report.issues.semAssignee.length - 5} tarefas sem responsável`);
    }
  }

  if (report.issues.duplicatas.length > 0) {
    console.log(`\n🔁 DUPLICATAS DETECTADAS (${report.issues.duplicatas.length} grupos):`);
    console.log('─'.repeat(70));
    report.issues.duplicatas.slice(0, 3).forEach((dup, idx) => {
      console.log(`   ${idx + 1}. "${dup.title}" (${dup.count} ocorrências)`);
      dup.tasks.forEach((task, taskIdx) => {
        console.log(`      ${taskIdx + 1}. ID: ${task.id.slice(0, 8)}... | Status: ${task.status} | Criado: ${new Date(task.created_at).toLocaleDateString('pt-BR')}`);
      });
      console.log('');
    });
    if (report.issues.duplicatas.length > 3) {
      console.log(`   ... e mais ${report.issues.duplicatas.length - 3} grupos de duplicatas`);
    }
  }

  // Recomendações
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMENDAÇÕES');
  console.log('='.repeat(70));

  const recommendations: string[] = [];

  if (report.issues.atrasadas30Dias.length > 0) {
    recommendations.push(`• Revisar urgentemente ${report.issues.atrasadas30Dias.length} tarefas atrasadas > 30 dias`);
    recommendations.push(`  Ações: atualizar status, reprogramar ou cancelar`);
  }
  if (report.issues.semAssignee.length > 0) {
    recommendations.push(`• Atribuir responsável para ${report.issues.semAssignee.length} tarefas`);
  }
  if (report.issues.semDeal.length > 0) {
    recommendations.push(`• Vincular ${report.issues.semDeal.length} tarefas a negócios ou arquivar`);
  }
  if (report.issues.semDueDate.length > 0) {
    recommendations.push(`• Definir data de vencimento para ${report.issues.semDueDate.length} tarefas`);
  }
  if (report.issues.duplicatas.length > 0) {
    recommendations.push(`• Consolidar ou deletar ${report.issues.duplicatas.length} grupos de tarefas duplicadas`);
  }

  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(`   ${rec}`));
  } else {
    console.log('   ✅ Nenhuma ação crítica necessária!');
    console.log('   📈 A qualidade dos dados está excelente.');
  }

  console.log('='.repeat(70) + '\n');

  // Summary
  if (report.score < 50) {
    console.log('🔴 ATENÇÃO: Score de qualidade crítico! Revisar dados urgentemente.\n');
  } else if (report.score < 80) {
    console.log('🟡 Qualidade moderada. Recomenda-se melhorias.\n');
  } else {
    console.log('🟢 Excelente qualidade de dados!\n');
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando auditoria de tarefas...\n');

  try {
    const tasks = await fetchAllTasks();
    const report = auditTasks(tasks);
    printReport(report);

    console.log('✅ Auditoria concluída com sucesso!\n');

    // Exit code baseado no score
    if (report.score < 50) {
      process.exit(1); // Falha crítica
    }
  } catch (error) {
    console.error('\n❌ Erro fatal durante execução:', error);
    process.exit(1);
  }
}

// Executar
main();
