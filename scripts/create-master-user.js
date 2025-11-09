#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingRequired = requiredEnv.filter((key) => !process.env[key]);

if (missingRequired.length > 0) {
  console.error(`Faltam variáveis de ambiente obrigatórias: ${missingRequired.join(', ')}`);
  process.exit(1);
}

const MASTER_EMAIL = process.env.MASTER_USER_EMAIL ?? 'sergio@amplabusiness.com.br';
const MASTER_PASSWORD = process.env.MASTER_USER_PASSWORD ?? '@Ampla123';

if (!process.env.MASTER_USER_PASSWORD) {
  console.warn('MASTER_USER_PASSWORD não definido; usando senha padrão de desenvolvimento @Ampla123.');
}

const MASTER_PROFILE = {
  full_name: process.env.MASTER_USER_NAME ?? 'Sergio Carneiro Leao',
  role: process.env.MASTER_USER_ROLE ?? 'Admin',
  organization: process.env.MASTER_USER_ORG ?? 'Ampla Contabilidade',
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const upsertMasterUser = async () => {
  const email = MASTER_EMAIL.trim().toLowerCase();

  console.log(`Provisionando usuário mestre (${email})...`);

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    console.error('Falha ao listar usuários existentes:', listError);
    process.exit(1);
  }

  const candidateUsers = Array.isArray(listData?.users) ? listData.users : [];
  const existingUser = candidateUsers.find((user) => user.email?.toLowerCase() === email);

  if (existingUser) {
    console.log('Usuário já existe. Atualizando metadados e senha.');

    const { error: passwordError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: MASTER_PASSWORD,
      user_metadata: {
        ...existingUser.user_metadata,
        ...MASTER_PROFILE,
      },
    });

    if (passwordError) {
      console.error('Falha ao atualizar usuário mestre:', passwordError);
      process.exit(1);
    }

    console.log('Usuário mestre atualizado com sucesso.');
    return;
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password: MASTER_PASSWORD,
    email_confirm: true,
    user_metadata: MASTER_PROFILE,
  });

  if (createError) {
    console.error('Falha ao criar usuário mestre:', createError);
    process.exit(1);
  }

  console.log('Usuário mestre criado com sucesso.');
};

upsertMasterUser().catch((error) => {
  console.error('Erro inesperado ao provisionar o usuário mestre:', error);
  process.exit(1);
});
