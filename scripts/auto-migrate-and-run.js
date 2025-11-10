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

async function executeSQLDirect(sql) {
  // Usar PostgREST endpoint para executar SQL
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function applyMigrationDirect() {
  console.log('🚀 APLICAÇÃO AUTOMÁTICA DA MIGRAÇÃO SQL\n');
  
  // Ler SQL
  const sqlPath = join(__dirname, 'migrations', '004_empresa_documentos.sql');
  console.log(`📂 Lendo: ${sqlPath}\n`);
  
  const sqlContent = readFileSync(sqlPath, 'utf-8');
  
  // Dividir em statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10);
  
  console.log(`📊 Encontrados ${statements.length} statements SQL`);
  console.log(`📏 Tamanho total: ${sqlContent.length} caracteres\n`);
  
  // Tentar executar via API
  console.log('⚙️ Tentando executar via Supabase REST API...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);
    
    const result = await executeSQLDirect(stmt);
    
    if (result.success) {
      console.log(`   ✅ Executado com sucesso`);
      successCount++;
    } else {
      console.log(`   ❌ Erro: ${result.error}`);
      failCount++;
      
      // Se erro indica que exec_sql não existe, parar e instruir manual
      if (result.error.includes('function') || result.error.includes('not found')) {
        console.log('\n⚠️ O endpoint exec_sql não está disponível no Supabase.');
        console.log('💡 Aplicação manual necessária via Dashboard.\n');
        return { method: 'manual', successCount, failCount };
      }
    }
    
    // Pequeno delay entre statements
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 RESULTADO:`);
  console.log(`   ✅ Sucesso: ${successCount}`);
  console.log(`   ❌ Falhas: ${failCount}\n`);
  
  if (failCount === 0) {
    console.log('🎉 Migração aplicada com sucesso via API!\n');
    return { method: 'api', success: true };
  } else {
    return { method: 'mixed', successCount, failCount };
  }
}

async function main() {
  const result = await applyMigrationDirect();
  
  if (result.method === 'manual' || (result.method === 'mixed' && result.failCount > 0)) {
    console.log('📋 INSTRUÇÕES PARA APLICAÇÃO MANUAL:\n');
    console.log('1. Abra o Dashboard Supabase:');
    console.log(`   ${SUPABASE_URL.replace('/rest/v1', '')}/project/_/sql\n`);
    console.log('2. Clique em "New Query"');
    console.log('3. Cole o conteúdo do arquivo:');
    console.log('   scripts/migrations/004_empresa_documentos.sql\n');
    console.log('4. Clique em "RUN" (ou pressione Ctrl+Enter)\n');
    console.log('5. Aguarde confirmação de sucesso\n');
    console.log('6. Execute: node scripts/run-full-automation.js --skip-migration\n');
    
    // Mostrar conteúdo para copiar
    const sqlPath = join(__dirname, 'migrations', '004_empresa_documentos.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 SQL PARA COPIAR:');
    console.log('═'.repeat(70));
    console.log(sqlContent);
    console.log('═'.repeat(70));
    console.log('\n✂️ Copie o conteúdo acima e cole no Dashboard Supabase\n');
    
    process.exit(0);
  } else if (result.method === 'api' && result.success) {
    console.log('✅ Migração concluída! Executando automação completa...\n');
    
    // Executar automação completa
    const { execSync } = await import('child_process');
    execSync('node scripts/run-full-automation.js --skip-migration', {
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });
  }
}

main().catch(console.error);
