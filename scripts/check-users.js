#!/usr/bin/env node
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY necessárias');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('\n👥 Verificando usuários no sistema\n');
  
  try {
    // Buscar todos os profiles
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(`❌ Erro ao buscar profiles: ${error.message}`);
      return;
    }
    
    console.log(`📊 Total de usuários: ${profiles.length}\n`);
    
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name || '(sem nome)'}`);
      console.log(`   Email: ${profile.email || '(sem email)'}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Status: ${profile.status}`);
      console.log(`   ID: ${profile.id}`);
      console.log('');
    });
    
    // Verificar se tem admin
    const admins = profiles.filter(p => p.role === 'Admin');
    
    if (admins.length === 0) {
      console.log('⚠️  NENHUM ADMIN encontrado!');
      console.log('   Será necessário promover um usuário ou criar um novo admin.\n');
    } else {
      console.log(`✅ ${admins.length} Admin(s) encontrado(s)\n`);
      admins.forEach(admin => {
        console.log(`   👑 Admin: ${admin.name} (${admin.email})`);
      });
      console.log('');
    }
    
    // Verificar dados existentes
    const { count: dealsCount } = await adminClient
      .from('deals')
      .select('*', { count: 'exact', head: true });
    
    const { count: tasksCount } = await adminClient
      .from('tasks')
      .select('*', { count: 'exact', head: true });
    
    const { count: empresasCount } = await adminClient
      .from('empresas')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Dados no sistema:\n');
    console.log(`   Empresas: ${empresasCount ?? 0}`);
    console.log(`   Deals: ${dealsCount ?? 0}`);
    console.log(`   Tasks: ${tasksCount ?? 0}`);
    console.log('');
    
  } catch (err) {
    console.error(`\n❌ Erro: ${err.message}\n`);
    process.exit(1);
  }
}

main();
