#!/usr/bin/env node
/**
 * Script de seed para tasks (tarefas) realistas vinculadas a deals
 * Popula 40-50 tarefas com variação de status, prioridades e datas
 * 
 * Uso:
 *   npx tsx scripts/seed-tasks.ts
 *   npx tsx scripts/seed-tasks.ts --dry-run
 *   npx tsx scripts/seed-tasks.ts --reset
 */

import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const isReset = process.argv.includes('--reset');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Distribuição de status
const STATUS_DISTRIBUTION = [
  { status: 'A Fazer', weight: 0.40 },         // 40%
  { status: 'Em Andamento', weight: 0.35 },    // 35%
  { status: 'Concluída', weight: 0.25 },       // 25%
] as const;

// Distribuição de prioridades
const PRIORITY_DISTRIBUTION = [
  { priority: 'Alta', weight: 0.30 },          // 30%
  { priority: 'Média', weight: 0.50 },         // 50%
  { priority: 'Baixa', weight: 0.20 },         // 20%
] as const;

// Templates de tarefas por estágio do deal
const TASK_TEMPLATES_BY_STAGE: Record<string, string[]> = {
  'Prospecting': [
    'Pesquisar informações sobre a empresa',
    'Identificar decisores e contatos principais',
    'Preparar pitch personalizado',
    'Buscar referências e cases similares',
    'Analisar CNPJ e situação fiscal',
    'Mapear concorrentes do prospect',
  ],
  'Qualification': [
    'Agendar reunião de qualificação',
    'Enviar questionário de necessidades',
    'Validar budget disponível',
    'Identificar timeline de decisão',
    'Apresentar portfólio de serviços',
    'Entender dores e desafios atuais',
  ],
  'Proposal': [
    'Elaborar proposta comercial customizada',
    'Calcular ROI e benefícios esperados',
    'Preparar apresentação executiva',
    'Enviar proposta formal por e-mail',
    'Follow-up após envio de proposta',
    'Agendar reunião de apresentação',
    'Revisar proposta com ajustes solicitados',
  ],
  'Negotiation': [
    'Negociar condições comerciais',
    'Revisar cláusulas contratuais',
    'Alinhar SLA e prazos de entrega',
    'Preparar minuta de contrato',
    'Obter aprovações internas',
    'Agendar reunião de fechamento',
    'Confirmar disponibilidade de recursos',
  ],
  'Closed Won': [
    'Preparar documentação de onboarding',
    'Agendar kickoff do projeto',
    'Configurar acesso aos sistemas',
    'Apresentar equipe operacional',
    'Coletar documentos obrigatórios',
    'Definir cronograma de implementação',
    'Enviar boas-vindas ao cliente',
  ],
  'Closed Lost': [
    'Registrar motivo da perda',
    'Solicitar feedback do prospect',
    'Identificar gaps na proposta',
    'Planejar follow-up em 6 meses',
    'Atualizar CRM com lições aprendidas',
  ],
};

// Templates de descrições detalhadas
const TASK_DESCRIPTIONS: Record<string, string[]> = {
  'Alta': [
    'Urgente: cliente solicitou retorno em até 24h',
    'Bloqueador: impede avanço do deal',
    'Deadline crítico: data de fechamento próxima',
    'Solicitação direta do decisor',
  ],
  'Média': [
    'Importante para manter momentum do deal',
    'Necessário para próxima etapa do processo',
    'Melhora posicionamento competitivo',
    'Reduz risco de perda do negócio',
  ],
  'Baixa': [
    'Complementar: pode aguardar sem prejuízo',
    'Nice to have: agrega valor mas não urgente',
    'Preparação para etapas futuras',
    'Follow-up de rotina',
  ],
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(array: T[]): T => array[randomInt(0, array.length - 1)];

const selectWeighted = <T extends { weight: number }>(items: readonly T[]): Omit<T, 'weight'> => {
  const random = Math.random();
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (random <= cumulative) {
      const { weight, ...rest } = item;
      return rest as Omit<T, 'weight'>;
    }
  }
  const { weight, ...rest } = items[0];
  return rest as Omit<T, 'weight'>;
};

const generateDueDate = (status: string): string | null => {
  const today = new Date();
  
  if (status === 'Concluída') {
    // Tarefas concluídas: entre -60 e -5 dias
    const daysBack = randomInt(5, 60);
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    return date.toISOString().split('T')[0];
  }
  
  if (status === 'Em Andamento') {
    // Tarefas em andamento: entre -5 e +15 dias
    const offset = randomInt(-5, 15);
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  }
  
  // A Fazer: entre +1 e +60 dias
  const daysForward = randomInt(1, 60);
  const date = new Date(today);
  date.setDate(date.getDate() + daysForward);
  return date.toISOString().split('T')[0];
};

const generateTasks = async (count: number = 45) => {
  console.log(`\n🎲 Gerando ${count} tasks realistas...`);

  // Buscar deals do banco para vincular
  const { data: deals } = await supabase
    .from('deals')
    .select('id, company_name, stage')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!deals || deals.length === 0) {
    throw new Error('Nenhum deal encontrado. Execute seed-deals.ts primeiro!');
  }

  // Buscar usuários para assignee
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(10);

  const tasks = [];

  for (let i = 0; i < count; i++) {
    const deal = randomItem(deals);
    const stage = deal.stage as keyof typeof TASK_TEMPLATES_BY_STAGE;
    const taskTemplates = TASK_TEMPLATES_BY_STAGE[stage] || TASK_TEMPLATES_BY_STAGE['Prospecting'];
    
    const title = randomItem(taskTemplates);
    const { status } = selectWeighted(STATUS_DISTRIBUTION);
    const { priority } = selectWeighted(PRIORITY_DISTRIBUTION);
    const dueDate = generateDueDate(status);
    
    const description = randomItem(TASK_DESCRIPTIONS[priority]);
    const assigneeId = users && users.length > 0 ? randomItem(users).id : null;

    tasks.push({
      title,
      priority,
      status,
      due_date: dueDate,
      description,
      deal_id: deal.id,
      related_deal_name: deal.company_name,
      assignee_id: assigneeId,
    });
  }

  return tasks;
};

const main = async () => {
  console.log('📋 Seed de Tasks - Contta CRM');
  console.log(`   Modo: ${isDryRun ? 'DRY RUN (simulação)' : 'PRODUÇÃO'}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);

  if (isReset) {
    console.log('\n🗑️  Removendo tasks existentes...');
    if (!isDryRun) {
      const { error } = await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw new Error(`Falha ao limpar tasks: ${error.message}`);
      console.log('   ✅ Tasks removidas');
    } else {
      console.log('   [dry-run] Removeria todas as tasks');
    }
    return;
  }

  const tasks = await generateTasks(45);

  console.log('\n📊 Distribuição de Status:');
  const statusDist = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(statusDist).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} (${Math.round((Number(count) / tasks.length) * 100)}%)`);
  });

  console.log('\n🎯 Distribuição de Prioridades:');
  const priorityDist = tasks.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(priorityDist).forEach(([priority, count]) => {
    console.log(`   ${priority}: ${count} (${Math.round((Number(count) / tasks.length) * 100)}%)`);
  });

  console.log('\n📅 Distribuição de Prazos:');
  const today = new Date();
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'Concluída').length;
  const thisWeek = tasks.filter(t => {
    if (!t.due_date || t.status === 'Concluída') return false;
    const dueDate = new Date(t.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;
  const thisMonth = tasks.filter(t => {
    if (!t.due_date || t.status === 'Concluída') return false;
    const dueDate = new Date(t.due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7 && diffDays <= 30;
  }).length;

  console.log(`   Atrasadas: ${overdue}`);
  console.log(`   Próximos 7 dias: ${thisWeek}`);
  console.log(`   Próximos 30 dias: ${thisMonth}`);

  if (!isDryRun) {
    console.log('\n💾 Inserindo tasks no Supabase...');
    const { data, error } = await supabase.from('tasks').insert(tasks).select('id, title, status, priority');

    if (error) {
      throw new Error(`Falha ao inserir tasks: ${error.message}`);
    }

    console.log(`   ✅ ${data?.length || 0} tasks inseridas com sucesso`);
    
    console.log('\n📋 Primeiras 5 tasks criadas:');
    data?.slice(0, 5).forEach(t => {
      console.log(`   - [${t.priority}] ${t.title} (${t.status})`);
    });
  } else {
    console.log('\n[dry-run] Seriam inseridas as seguintes tasks:');
    tasks.slice(0, 5).forEach(t => {
      console.log(`   - [${t.priority}] ${t.title} (${t.status})`);
    });
    console.log(`   ... e mais ${tasks.length - 5} tasks`);
  }

  console.log('\n✅ Seed de tasks concluído!');
  console.log('\n💡 Próximos passos:');
  console.log('   1. Execute: npx tsx scripts/seed-indicacoes.ts');
  console.log('   2. Valide: npm run dev e navegue para /tarefas');
};

main()
  .catch((error) => {
    console.error('\n❌ Erro ao executar seed:', error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
