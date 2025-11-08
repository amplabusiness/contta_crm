// Script para verificar se as variáveis de ambiente estão configuradas
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  const envContent = readFileSync(join(rootDir, '.env.local'), 'utf-8');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY'
  ];
  
  const optionalVars = [
    'GEMINI_API_KEY'
  ];
  
  console.log('\n🔍 Verificando variáveis de ambiente...\n');
  
  let allOk = true;
  
  // Verificar variáveis obrigatórias
  console.log('📋 Variáveis Obrigatórias:');
  requiredVars.forEach(varName => {
    const hasVar = envContent.includes(`${varName}=`) && 
                   !envContent.match(new RegExp(`${varName}=\\s*$`)) &&
                   !envContent.match(new RegExp(`${varName}=\\s*#`));
    
    if (hasVar) {
      const value = envContent.match(new RegExp(`${varName}=([^\\n]+)`))?.[1];
      const maskedValue = value && value.length > 20 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
        : '***';
      console.log(`  ✅ ${varName}: ${maskedValue}`);
    } else {
      console.log(`  ❌ ${varName}: NÃO CONFIGURADA`);
      allOk = false;
    }
  });
  
  // Verificar variáveis opcionais
  console.log('\n📋 Variáveis Opcionais:');
  optionalVars.forEach(varName => {
    const hasVar = envContent.includes(`${varName}=`) && 
                   !envContent.match(new RegExp(`${varName}=\\s*$`)) &&
                   !envContent.match(new RegExp(`${varName}=\\s*#`));
    
    if (hasVar) {
      console.log(`  ✅ ${varName}: Configurada`);
    } else {
      console.log(`  ⚠️  ${varName}: Não configurada (opcional)`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  if (allOk) {
    console.log('✅ Todas as variáveis obrigatórias estão configuradas!');
    console.log('\n🚀 Próximos passos:');
    console.log('   1. Execute o script SQL no Supabase (supabase-schema.sql)');
    console.log('   2. Execute: npm run dev (ou vercel dev)');
  } else {
    console.log('❌ Algumas variáveis obrigatórias estão faltando!');
    console.log('\n📖 Consulte o GUIA_ENV.md para instruções detalhadas.');
  }
  console.log('='.repeat(50) + '\n');
  
  process.exit(allOk ? 0 : 1);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('\n❌ Arquivo .env.local não encontrado!');
    console.log('\n📝 Crie o arquivo .env.local baseado no env.local.template');
    console.log('   Comando: copy env.local.template .env.local\n');
  } else {
    console.error('\n❌ Erro ao ler .env.local:', error.message);
  }
  process.exit(1);
}

