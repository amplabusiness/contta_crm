#!/usr/bin/env node
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
  console.error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const SEED_OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'sergio@amplabusiness.com.br';
const isDryRun = process.argv.includes('--dry-run');
const isReset = process.argv.includes('--reset');

const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const seedDealIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
];

const seedTaskIds = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
];

const seedCompanies = [
  {
    cnpj: '00000000000191',
    razao_social: 'Seed Contabilidade Integrada LTDA [SEED]',
    nome_fantasia: 'Seed Contabilidade',
    cidade: 'São Paulo',
    uf: 'SP',
    porte: 'Médio',
    cnae_principal_codigo: '6920601',
    cnae_principal_descricao: 'Atividades de contabilidade',
  },
  {
    cnpj: '00000000000272',
    razao_social: 'Seed Tecnologia Financeira SA [SEED]',
    nome_fantasia: 'Seed TechFin',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    porte: 'Grande',
    cnae_principal_codigo: '6204000',
    cnae_principal_descricao: 'Consultoria em tecnologia da informação',
  },
];

const findUserByEmail = async (email) => {
  const normalized = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Falha ao listar usuários (página ${page}): ${error.message}`);
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((candidate) => candidate.email?.toLowerCase() === normalized);

    if (match) {
      return match;
    }

    if (users.length < 200) {
      return null;
    }

    page += 1;
  }
};

const ensureProfile = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name ?? user.email ?? 'Seed Owner',
    role: user.user_metadata?.role ?? 'Admin',
    status: 'Ativo',
  };

  const { error } = await adminClient
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw new Error(`Falha ao garantir profile do usuário seed: ${error.message}`);
  }
};

const buildDealSeeds = (ownerId) => [
  {
    id: seedDealIds[0],
    company_name: 'Seed TechFin Expansion [SEED]',
    value: 150000,
    stage: 'Negotiation',
    expected_close_date: new Date().toISOString().slice(0, 10),
    last_activity: new Date().toISOString(),
    empresa_cnpj: seedCompanies[1].cnpj,
    owner_id: ownerId,
    contact_name: 'Ana Lima',
    contact_email: 'ana.lima@seedtechfin.com',
    probability: 0.65,
    health_score: 82,
    health_reasoning: 'Cliente com alto interesse após demonstração',
    health_suggested_action: 'Enviar proposta detalhada com SLA customizado',
  },
  {
    id: seedDealIds[1],
    company_name: 'Seed Contabilidade Serviços 360 [SEED]',
    value: 45000,
    stage: 'Proposal',
    expected_close_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString().slice(0, 10),
    last_activity: new Date().toISOString(),
    empresa_cnpj: seedCompanies[0].cnpj,
    owner_id: ownerId,
    contact_name: 'Carlos Prado',
    contact_email: 'carlos.prado@seedcontabilidade.com',
    probability: 0.55,
    health_score: 74,
    health_reasoning: 'Cliente pediu ajustes na proposta financeira',
    health_suggested_action: 'Agendar reunião para alinhamento de escopo e valor',
  },
];

const buildTaskSeeds = (ownerId) => [
  {
    id: seedTaskIds[0],
    title: 'Preparar proposta revisada Seed TechFin [SEED]',
    priority: 'Alta',
    status: 'Em Andamento',
    description: 'Incluir módulo fiscal adicional e rever prazos de implementação.',
    assignee_id: ownerId,
    deal_id: seedDealIds[0],
    related_deal_name: 'Seed TechFin Expansion [SEED]',
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
  },
  {
    id: seedTaskIds[1],
    title: 'Follow-up com Seed Contabilidade [SEED]',
    priority: 'Média',
    status: 'A Fazer',
    description: 'Confirmar disponibilidade para reunião de alinhamento na próxima semana.',
    assignee_id: ownerId,
    deal_id: seedDealIds[1],
    related_deal_name: 'Seed Contabilidade Serviços 360 [SEED]',
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
  },
];

const removeSeedData = async () => {
  console.log('Removendo deals de seed...');
  const { error: dealsError } = await adminClient.from('deals').delete().in('id', seedDealIds);
  if (dealsError) {
    throw new Error(`Falha ao remover deals: ${dealsError.message}`);
  }

  console.log('Removendo tarefas de seed...');
  const { error: tasksError } = await adminClient.from('tasks').delete().in('id', seedTaskIds);
  if (tasksError) {
    throw new Error(`Falha ao remover tarefas: ${tasksError.message}`);
  }
};

const main = async () => {
  console.log('🌱 Seed de dados demo do Contta CRM');

  const ownerUser = await findUserByEmail(SEED_OWNER_EMAIL);
  if (!ownerUser) {
    throw new Error(
      `Usuário responsável pelo seed (${SEED_OWNER_EMAIL}) não encontrado. Execute scripts/create-master-user.js primeiro ou defina SEED_OWNER_EMAIL.`,
    );
  }

  if (!isDryRun) {
    await ensureProfile(ownerUser);
  } else {
    console.log(`[dry-run] Garantiria profile para ${ownerUser.email}`);
  }

  if (isReset || isDryRun) {
    console.log(isDryRun ? '[dry-run] Resetaria dados de seed' : 'Limpando dados de seed existentes...');
    if (!isDryRun) {
      await removeSeedData();
    }
  }

  if (isReset) {
    console.log('Reset finalizado.');
    return;
  }

  console.log(isDryRun ? '[dry-run] Upsertaria empresas seed' : 'Inserindo/atualizando empresas seed...');
  if (!isDryRun) {
    const { error: companiesError } = await adminClient
      .from('empresas')
      .upsert(seedCompanies, { onConflict: 'cnpj' });

    if (companiesError) {
      throw new Error(`Falha ao upsert empresas seed: ${companiesError.message}`);
    }
  }

  const dealSeeds = buildDealSeeds(ownerUser.id);
  console.log(isDryRun ? '[dry-run] Upsertaria deals seed' : 'Inserindo/atualizando deals seed...');
  if (!isDryRun) {
    const { error: dealsError } = await adminClient
      .from('deals')
      .upsert(dealSeeds, { onConflict: 'id' });

    if (dealsError) {
      throw new Error(`Falha ao upsert deals seed: ${dealsError.message}`);
    }
  }

  const taskSeeds = buildTaskSeeds(ownerUser.id);
  console.log(isDryRun ? '[dry-run] Upsertaria tarefas seed' : 'Inserindo/atualizando tarefas seed...');
  if (!isDryRun) {
    const { error: tasksError } = await adminClient
      .from('tasks')
      .upsert(taskSeeds, { onConflict: 'id' });

    if (tasksError) {
      throw new Error(`Falha ao upsert tarefas seed: ${tasksError.message}`);
    }
  }

  console.log('✅ Seed concluído com sucesso. Utilize --reset para remover os dados inseridos.');
};

main()
  .catch((error) => {
    console.error('❌ Seed falhou:', error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
