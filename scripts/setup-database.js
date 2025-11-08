// Script automatizado para configurar o banco de dados no Supabase
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🗄️  CONFIGURAÇÃO AUTOMATIZADA DO BANCO DE DADOS');
  console.log('='.repeat(60) + '\n');

  try {
    // Ler o arquivo SQL
    const sqlFile = join(rootDir, 'supabase-schema.sql');
    const sqlContent = readFileSync(sqlFile, 'utf-8');

    console.log('✅ Script SQL carregado com sucesso!\n');
    console.log('📋 INSTRUÇÕES:\n');
    console.log('1. Abra o Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Selecione seu projeto');
    console.log('3. Vá em "SQL Editor" (no menu lateral)');
    console.log('4. Cole o SQL abaixo e clique em "Run"\n');
    
    console.log('─'.repeat(60));
    console.log('📄 SQL PARA COPIAR:');
    console.log('─'.repeat(60));
    console.log(sqlContent);
    console.log('─'.repeat(60) + '\n');

    await question('\n⏸️  Pressione ENTER após executar o SQL no Supabase...');

    console.log('\n✅ Verificando tabelas criadas...\n');
    console.log('📋 Tabelas que devem ser criadas:');
    console.log('   ✓ profiles');
    console.log('   ✓ empresas');
    console.log('   ✓ socios');
    console.log('   ✓ empresa_socios');
    console.log('   ✓ deals');
    console.log('   ✓ tasks');
    console.log('   ✓ indicacoes\n');

    const verificou = await question('✅ Você verificou que as tabelas foram criadas? (s/n): ');
    
    if (verificou.toLowerCase() === 's') {
      console.log('\n🎉 Banco de dados configurado com sucesso!');
      console.log('\n📝 Próximos passos:');
      console.log('   1. Configure a API de CNPJ (veja ROADMAP_COMPLETO.md)');
      console.log('   2. Execute: npm run load-cnpjs');
      console.log('   3. Execute: npm run dev\n');
    } else {
      console.log('\n⚠️  Por favor, verifique se todas as tabelas foram criadas.');
      console.log('   Se houver erros, copie e cole o SQL novamente.\n');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n💡 Solução alternativa:');
    console.log('   1. Abra manualmente o arquivo supabase-schema.sql');
    console.log('   2. Copie o conteúdo');
    console.log('   3. Cole no SQL Editor do Supabase\n');
  } finally {
    rl.close();
  }
}

main();

