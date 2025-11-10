#!/usr/bin/env node
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Carregar .env.local
config({ path: join(rootDir, '.env.local') });

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'VITE_SUPABASE_ANON_KEY'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Variáveis de ambiente ausentes: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const USERS = {
  tester: {
    email: 'qa-rls-user@contta.crm',
    password: 'TestUser123!@#',
    metadata: {
      full_name: 'QA RLS User',
      role: 'User',
      organization: 'QA Lab',
    },
  },
  other: {
    email: 'qa-rls-other@contta.crm',
    password: 'TestOther123!@#',
    metadata: {
      full_name: 'QA RLS Other',
      role: 'User',
      organization: 'QA Lab',
    },
  },
  admin: {
    email: 'qa-rls-admin@contta.crm',
    password: 'TestAdmin123!@#',
    metadata: {
      full_name: 'QA RLS Admin',
      role: 'Admin',
      organization: 'QA Lab',
    },
  },
};

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

const ensureProfile = async (user, metadata) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: metadata.full_name ?? user.email ?? 'Usuário QA',
    role: metadata.role ?? 'User',
    status: 'Ativo',
  };

  const { error } = await adminClient
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw new Error(`Falha ao garantir profile para ${user.email}: ${error.message}`);
  }
};

const ensureUser = async ({ email, password, metadata }) => {
  const existing = await findUserByEmail(email);

  if (existing) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, ...metadata },
    });

    if (error) {
      throw new Error(`Falha ao atualizar usuário ${email}: ${error.message}`);
    }

    const user = data?.user ?? existing;
    await ensureProfile(user, metadata);
    return { ...user, password };
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data?.user) {
    throw new Error(`Falha ao criar usuário ${email}: ${error?.message ?? 'sem detalhes'}`);
  }

  await ensureProfile(data.user, metadata);
  return { ...data.user, password };
};

const getAuthedClient = async ({ email, password }) => {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Falha ao autenticar ${email}: ${error.message}`);
  }

  return client;
};

const createdDealIds = [];
const createdTaskIds = [];

const createFixtureDeal = async ({ ownerId, label }) => {
  const uniqueLabel = `${label}-${randomUUID()}`;
  const { data, error } = await adminClient
    .from('deals')
    .insert({
      company_name: `QA ${uniqueLabel}`,
      value: 1000,
      stage: 'Prospecting',
      owner_id: ownerId,
      contact_name: 'QA Contact',
      contact_email: 'qa@contta.crm',
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(`Falha ao criar negócio de teste (${label}): ${error?.message ?? 'sem id retornado'}`);
  }

  createdDealIds.push(data.id);
  return data.id;
};

const createFixtureTask = async ({ assigneeId, relatedDealId, label }) => {
  const uniqueLabel = `${label}-${randomUUID()}`;
  const { data, error } = await adminClient
    .from('tasks')
    .insert({
      title: `QA Task ${uniqueLabel}`,
      priority: 'Alta',
      status: 'A Fazer',
      description: 'RLS QA task',
      assignee_id: assigneeId,
      deal_id: relatedDealId ?? null,
      related_deal_name: relatedDealId ? `QA ${label}` : 'N/A',
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(`Falha ao criar tarefa de teste (${label}): ${error?.message ?? 'sem id retornado'}`);
  }

  createdTaskIds.push(data.id);
  return data.id;
};

const expectNoMutation = ({ data, error }, context) => {
  if (error) {
    if (/row-level security/i.test(error.message) || /permission denied/i.test(error.message)) {
      return;
    }
    throw new Error(`${context}: operação retornou erro inesperado -> ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  throw new Error(`${context}: a operação deveria ser bloqueada por RLS, mas retornou ${data.length} linha(s).`);
};

const expectSuccessfulMutation = ({ data, error }, context) => {
  if (error) {
    throw new Error(`${context}: operação deveria ser permitida, mas falhou -> ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${context}: nenhuma linha retornada após operação esperada como válida.`);
  }
};

const main = async () => {
  console.log('🔐 Iniciando QA de RLS...');

  const tester = await ensureUser(USERS.tester);
  const other = await ensureUser(USERS.other);
  const admin = await ensureUser(USERS.admin);

  const testerDealId = await createFixtureDeal({ ownerId: tester.id, label: 'Tester' });
  const otherDealId = await createFixtureDeal({ ownerId: other.id, label: 'Other' });

  const testerTaskId = await createFixtureTask({ assigneeId: tester.id, relatedDealId: testerDealId, label: 'Tester' });
  const otherTaskId = await createFixtureTask({ assigneeId: other.id, relatedDealId: otherDealId, label: 'Other' });

  const testerClient = await getAuthedClient(tester);
  const otherClient = await getAuthedClient(other);
  const adminClientAuthed = await getAuthedClient(admin);

  // Usuário comum não pode alterar negócio de outro usuário
  const testerUpdateForeignDeal = await testerClient
    .from('deals')
    .update({ stage: 'Negotiation' })
    .eq('id', otherDealId)
    .select('id');
  expectNoMutation(testerUpdateForeignDeal, 'Tester alterando negócio de outro usuário');

  // Usuário comum pode alterar seu próprio negócio
  const testerUpdateOwnDeal = await testerClient
    .from('deals')
    .update({ stage: 'Qualification' })
    .eq('id', testerDealId)
    .select('id');
  expectSuccessfulMutation(testerUpdateOwnDeal, 'Tester alterando o próprio negócio');

  // Usuário comum não pode atualizar tarefa de outro usuário
  const testerUpdateForeignTask = await testerClient
    .from('tasks')
    .update({ status: 'Concluída' })
    .eq('id', otherTaskId)
    .select('id');
  expectNoMutation(testerUpdateForeignTask, 'Tester alterando tarefa de outro usuário');

  // Usuário comum pode atualizar a própria tarefa
  const testerUpdateOwnTask = await testerClient
    .from('tasks')
    .update({ status: 'Em Andamento' })
    .eq('id', testerTaskId)
    .select('id');
  expectSuccessfulMutation(testerUpdateOwnTask, 'Tester alterando a própria tarefa');

  // Usuário comum não pode reatribuir sua tarefa para outro usuário
  const testerReassignTask = await testerClient
    .from('tasks')
    .update({ assignee_id: other.id })
    .eq('id', testerTaskId)
    .select('id');
  expectNoMutation(testerReassignTask, 'Tester reatribuindo tarefa para outro usuário');

  // Usuário comum não pode alterar perfil alheio
  const testerUpdateForeignProfile = await testerClient
    .from('profiles')
    .update({ name: 'H4cked' })
    .eq('id', other.id)
    .select('id');
  expectNoMutation(testerUpdateForeignProfile, 'Tester alterando perfil de outro usuário');

  // Usuário comum altera o próprio perfil com sucesso
  const testerUpdateOwnProfile = await testerClient
    .from('profiles')
    .update({ name: 'QA RLS User ✅' })
    .eq('id', tester.id)
    .select('id');
  expectSuccessfulMutation(testerUpdateOwnProfile, 'Tester alterando o próprio perfil');

  // Admin pode alterar negócio e tarefa de outro usuário
  const adminUpdatesForeignDeal = await adminClientAuthed
    .from('deals')
    .update({ stage: 'Proposal' })
    .eq('id', testerDealId)
    .select('id');
  expectSuccessfulMutation(adminUpdatesForeignDeal, 'Admin alterando negócio de terceiro');

  const adminUpdatesForeignTask = await adminClientAuthed
    .from('tasks')
    .update({ status: 'Concluída' })
    .eq('id', testerTaskId)
    .select('id');
  expectSuccessfulMutation(adminUpdatesForeignTask, 'Admin alterando tarefa de terceiro');

  console.log('✅ QA de RLS concluído sem violações.');
};

const cleanup = async () => {
  if (createdTaskIds.length > 0) {
    await adminClient.from('tasks').delete().in('id', createdTaskIds);
  }
  if (createdDealIds.length > 0) {
    await adminClient.from('deals').delete().in('id', createdDealIds);
  }
};

main()
  .catch(async (error) => {
    console.error('❌ QA de RLS falhou:', error);
    await cleanup();
    process.exit(1);
  })
  .then(async () => {
    await cleanup();
    process.exit(0);
  });
