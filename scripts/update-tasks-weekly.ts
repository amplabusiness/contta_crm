#!/usr/bin/env tsx
/**
 * Script de Revisão Semanal de Tarefas
 * 
 * Objetivo: Identificar tarefas atrasadas, sem assignee, ou sem deal vinculado.
 * Gera relatório semanal e pode enviar notificações (futuro).
 * 
 * Uso:
 *   npx tsx scripts/update-tasks-weekly.ts
 * 
 * Ambiente:
 *   - SUPABASE_URL e SUPABASE_SERVICE_KEY
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
  deal_id: string | null;
  related_deal_name: string | null;
  assignee_id: string | null;
  created_at: string;
}

interface WeeklyReport {
  total: number;
  atrasadas: TaskDB[];
  semAssignee: TaskDB[];
  semDeal: TaskDB[];
  concluidas: number;
  emAndamento: number;
  pendentes: number;
}

/**
 * Busca todas as tarefas ativas
 */
async function fetchAllTasks(): Promise<TaskDB[]> {
  console.log('🔍 Buscando todas as tarefas...');

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('❌ Erro ao buscar tarefas:', error.message);
    throw error;
  }

  console.log(`✅ Encontradas ${data.length} tarefas\n`);
  return data as TaskDB[];
}

/**
 * Analisa tarefas e gera relatório
 */
function analyzeTask(tasks: TaskDB[]): WeeklyReport {
  const today = new Date().toISOString().split('T')[0];
  
  const report: WeeklyReport = {
    total: tasks.length,
    atrasadas: [],
    semAssignee: [],
    semDeal: [],
    concluidas: 0,
    emAndamento: 0,
    pendentes: 0,
  };

  for (const task of tasks) {
    // Status
    if (task.status === 'Concluída') {
      report.concluidas++;
    } else if (task.status === 'Em Andamento') {
      report.emAndamento++;
    } else {
      report.pendentes++;
    }

    // Tarefas atrasadas (due_date < hoje e status != Concluída)
    if (task.due_date && task.due_date < today && task.status !== 'Concluída') {
      report.atrasadas.push(task);
    }

    // Tarefas sem assignee
    if (!task.assignee_id && task.status !== 'Concluída') {
      report.semAssignee.push(task);
    }

    // Tarefas sem deal vinculado
    if (!task.deal_id && task.status !== 'Concluída') {
      report.semDeal.push(task);
    }
  }

  return report;
}

/**
 * Exibe relatório no console
 */
function printReport(report: WeeklyReport) {
  console.log('='.repeat(70));
  console.log('📊 RELATÓRIO SEMANAL DE TAREFAS');
  console.log('='.repeat(70));
  console.log(`\n📈 Visão Geral:`);
  console.log(`   Total de tarefas: ${report.total}`);
  console.log(`   ✅ Concluídas: ${report.concluidas} (${((report.concluidas / report.total) * 100).toFixed(1)}%)`);
  console.log(`   🔄 Em andamento: ${report.emAndamento} (${((report.emAndamento / report.total) * 100).toFixed(1)}%)`);
  console.log(`   📋 Pendentes: ${report.pendentes} (${((report.pendentes / report.total) * 100).toFixed(1)}%)`);

  console.log(`\n⚠️ Alertas:`);
  console.log(`   🚨 Tarefas atrasadas: ${report.atrasadas.length}`);
  console.log(`   👤 Sem responsável: ${report.semAssignee.length}`);
  console.log(`   💼 Sem deal vinculado: ${report.semDeal.length}`);

  if (report.atrasadas.length > 0) {
    console.log(`\n🚨 TAREFAS ATRASADAS (${report.atrasadas.length}):`);
    console.log('─'.repeat(70));
    report.atrasadas.slice(0, 10).forEach((task, idx) => {
      const daysLate = Math.floor(
        (new Date().getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24)
      );
      console.log(`   ${idx + 1}. ${task.title}`);
      console.log(`      📅 Vencimento: ${task.due_date} (${daysLate} dias atrasada)`);
      console.log(`      🎯 Prioridade: ${task.priority} | Status: ${task.status}`);
      console.log(`      💼 Deal: ${task.related_deal_name || 'N/A'}`);
      console.log('');
    });
    if (report.atrasadas.length > 10) {
      console.log(`   ... e mais ${report.atrasadas.length - 10} tarefas atrasadas`);
    }
  }

  if (report.semAssignee.length > 0) {
    console.log(`\n👤 TAREFAS SEM RESPONSÁVEL (${report.semAssignee.length}):`);
    console.log('─'.repeat(70));
    report.semAssignee.slice(0, 5).forEach((task, idx) => {
      console.log(`   ${idx + 1}. ${task.title}`);
      console.log(`      📅 Vencimento: ${task.due_date || 'Não definido'}`);
      console.log(`      🎯 Prioridade: ${task.priority}`);
      console.log('');
    });
    if (report.semAssignee.length > 5) {
      console.log(`   ... e mais ${report.semAssignee.length - 5} tarefas sem responsável`);
    }
  }

  if (report.semDeal.length > 0) {
    console.log(`\n💼 TAREFAS SEM DEAL VINCULADO (${report.semDeal.length}):`);
    console.log('─'.repeat(70));
    report.semDeal.slice(0, 5).forEach((task, idx) => {
      console.log(`   ${idx + 1}. ${task.title}`);
      console.log(`      📅 Vencimento: ${task.due_date || 'Não definido'}`);
      console.log(`      🎯 Prioridade: ${task.priority}`);
      console.log('');
    });
    if (report.semDeal.length > 5) {
      console.log(`   ... e mais ${report.semDeal.length - 5} tarefas sem deal`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('💡 Recomendações:');
  console.log('='.repeat(70));
  
  if (report.atrasadas.length > 0) {
    console.log('   • Revisar e atualizar status das tarefas atrasadas');
    console.log('   • Considerar reprogramar ou cancelar tarefas obsoletas');
  }
  
  if (report.semAssignee.length > 0) {
    console.log('   • Atribuir responsáveis para as tarefas pendentes');
  }
  
  if (report.semDeal.length > 0) {
    console.log('   • Vincular tarefas a negócios ou considerar arquivamento');
  }

  if (report.atrasadas.length === 0 && report.semAssignee.length === 0 && report.semDeal.length === 0) {
    console.log('   ✅ Tudo OK! Nenhum alerta crítico detectado.');
  }

  console.log('='.repeat(70) + '\n');
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando revisão semanal de tarefas...\n');

  try {
    const tasks = await fetchAllTasks();
    const report = analyzeTask(tasks);
    printReport(report);

    console.log('✅ Revisão concluída com sucesso!\n');
  } catch (error) {
    console.error('\n❌ Erro fatal durante execução:', error);
    process.exit(1);
  }
}

// Executar
main();
