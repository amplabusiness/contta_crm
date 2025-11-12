#!/usr/bin/env tsx
/**
 * Rotina diária de aniversariantes
 *
 * Objetivo: localizar sócios com aniversário no dia seguinte e
 * gerar tarefas "Enviar mensagem de aniversario" para o time de CS.
 *
 * Uso:
 *   npx tsx scripts/sync-birthdays.ts
 *
 * Ambiente necessário:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY (chave service role)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Defina SUPABASE_URL e SUPABASE_SERVICE_KEY antes de executar.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

interface SocioRecord {
  cpf_parcial: string;
  nome_socio: string;
  data_nascimento: string | null;
  empresa_cnpj: string;
  empresa_nome: string;
}

interface TaskPayload {
  title: string;
  due_date: string;
  priority: string;
  status: string;
  description: string;
  related_deal_name: string | null;
}

function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getTomorrow(): Date {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + 1);
  return base;
}

function isBirthdayOn(target: Date, dataNascimento: string | null): boolean {
  if (!dataNascimento) {
    return false;
  }

  const birthDate = new Date(dataNascimento);
  if (Number.isNaN(birthDate.getTime())) {
    return false;
  }

  return (
    birthDate.getUTCMonth() === target.getUTCMonth() &&
    birthDate.getUTCDate() === target.getUTCDate()
  );
}

async function fetchSocios(): Promise<SocioRecord[]> {
  console.log('🔎 Buscando sócios com data de nascimento...');

  const { data, error } = await supabase
    .from('socios')
    .select(`
      cpf_parcial,
      nome_socio,
      data_nascimento,
      empresa_socios ( empresa_cnpj, empresas ( razao_social, nome_fantasia ) )
    `);

  if (error) {
    console.error('❌ Falha ao consultar sócios:', error.message);
    throw error;
  }

  const socios: SocioRecord[] = [];

  (data ?? []).forEach((item: any) => {
    if (!item?.empresa_socios || item.empresa_socios.length === 0) {
      return;
    }

    item.empresa_socios.forEach((rel: any) => {
      const empresaNome = rel?.empresas?.nome_fantasia || rel?.empresas?.razao_social || null;
      socios.push({
        cpf_parcial: item.cpf_parcial,
        nome_socio: item.nome_socio,
        data_nascimento: item.data_nascimento,
        empresa_cnpj: rel.empresa_cnpj,
        empresa_nome: empresaNome,
      });
    });
  });

  console.log(`✅ Total de vínculos carregados: ${socios.length}`);
  return socios;
}

async function existingTaskExists(title: string, dueDate: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('title', title)
    .eq('due_date', dueDate)
    .limit(1);

  if (error) {
    console.error('⚠️ Não foi possível verificar tarefas existentes:', error.message);
    return false;
  }

  return (data ?? []).length > 0;
}

function buildTaskPayload(socio: SocioRecord, dueDateISO: string): TaskPayload {
  const title = `Enviar mensagem de aniversario - ${socio.nome_socio}`;
  const descriptionParts: string[] = [
    `Preparar homenagem personalizada para ${socio.nome_socio}.`,
    'Sugestão: mensagem pelo Communicator + cartão digital.',
  ];

  if (socio.empresa_nome) {
    descriptionParts.push(`Relacionar com a empresa: ${socio.empresa_nome}.`);
  }

  descriptionParts.push('Registrar retorno do cliente após o contato.');

  return {
    title,
    due_date: dueDateISO,
    priority: 'M\u00e9dia',
    status: 'A Fazer',
    description: descriptionParts.join('\n'),
    related_deal_name: socio.empresa_nome || null,
  };
}

async function createTasks(tasks: TaskPayload[]): Promise<number> {
  if (tasks.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks)
    .select('id');

  if (error) {
    console.error('❌ Erro ao criar tarefas de aniversários:', error.message);
    throw error;
  }

  return (data ?? []).length;
}

async function main() {
  console.log('🎉 Iniciando verificação de aniversariantes...');

  const tomorrow = getTomorrow();
  const targetISO = formatISODate(tomorrow);
  console.log(`📅 Executando rotina para aniversários de ${targetISO}`);

  try {
    const socios = await fetchSocios();

    const candidates = socios.filter((socio) => isBirthdayOn(tomorrow, socio.data_nascimento));
    console.log(`🎯 Sócios aniversariantes encontrados: ${candidates.length}`);

    const tasksToCreate: TaskPayload[] = [];

    for (const socio of candidates) {
      const payload = buildTaskPayload(socio, targetISO);
      const alreadyExists = await existingTaskExists(payload.title, payload.due_date);

      if (alreadyExists) {
        console.log(`↪️ Tarefa já existente para ${socio.nome_socio}, pulando...`);
        continue;
      }

      tasksToCreate.push(payload);
    }

    if (tasksToCreate.length === 0) {
      console.log('✅ Nenhuma nova tarefa necessária hoje.');
      return;
    }

    const createdCount = await createTasks(tasksToCreate);
    console.log(`✅ ${createdCount} tarefa(s) de homenagem criadas.`);

    console.log('\n📌 Recomendações:');
    console.log('   • Verificar no Communicator templates de felicitações.');
    console.log('   • Confirmar com o time de CS os responsáveis pelo follow-up.');
    console.log('   • Registrar feedback dos clientes em até 48h após o contato.');
  } catch (error) {
    console.error('❌ Rotina encerrada com erro:', error);
    process.exit(1);
  }
}

main();
