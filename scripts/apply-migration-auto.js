import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('📋 Aplicando migração 004_empresa_documentos.sql...\n');
  
  try {
    // Verificar se tabela já existe
    const { data: existing } = await supabase
      .from('empresa_documentos')
      .select('id')
      .limit(1);
    
    if (existing !== null && !existing.error) {
      console.log('✅ Tabela empresa_documentos já existe!');
      console.log('💡 Migração já foi aplicada anteriormente\n');
      return true;
    }
  } catch (e) {
    // Tabela não existe, continuar
  }
  
  // Ler arquivo SQL
  const sqlPath = join(__dirname, 'migrations', '004_empresa_documentos.sql');
  console.log(`📂 Lendo: ${sqlPath}`);
  
  const sqlContent = readFileSync(sqlPath, 'utf-8');
  
  // Estratégia: Usar fetch direto para a API REST do Supabase
  // que aceita SQL statements via endpoint /rest/v1/rpc
  
  console.log('\n⚙️ ESTRATÉGIA DE MIGRAÇÃO:');
  console.log('   Como o Supabase JS não executa DDL diretamente,');
  console.log('   você tem 2 opções:\n');
  
  console.log('   OPÇÃO A - MANUAL (RECOMENDADA):');
  console.log('   1. Abra: https://supabase.com/dashboard');
  console.log('   2. Navegue até: SQL Editor');
  console.log('   3. Cole o conteúdo de: scripts/migrations/004_empresa_documentos.sql');
  console.log('   4. Clique em RUN');
  console.log('   ⏱️  Tempo: ~2 minutos\n');
  
  console.log('   OPÇÃO B - SEMI-AUTOMÁTICA:');
  console.log('   1. Execute: node scripts/apply-documents-migration.js');
  console.log('   2. Copie o SQL exibido');
  console.log('   3. Cole no Dashboard e execute');
  console.log('   ⏱️  Tempo: ~1 minuto\n');
  
  // Exibir o SQL para facilitar
  console.log('📄 CONTEÚDO DA MIGRAÇÃO:');
  console.log('─'.repeat(60));
  console.log(sqlContent.substring(0, 500) + '...\n');
  console.log('─'.repeat(60));
  console.log(`📏 Total: ${sqlContent.length} caracteres\n`);
  
  console.log('❓ Deseja ver o SQL completo? (y/n)');
  console.log('💡 Ou execute diretamente no Dashboard Supabase\n');
  
  return false;
}

applyMigration().then(success => {
  if (success) {
    console.log('✅ Migração verificada com sucesso!');
  } else {
    console.log('⏳ Aguardando aplicação manual da migração...');
    console.log('📌 Após aplicar, execute: node scripts/run-full-automation.js --skip-migration\n');
  }
}).catch(console.error);
