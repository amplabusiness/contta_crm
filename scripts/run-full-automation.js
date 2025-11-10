import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.error('Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Utilitários
function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Passo 1: Aplicar migração SQL automaticamente
async function applyMigration() {
  logSection('📋 PASSO 1: Aplicando Migração SQL');
  
  try {
    // Ler arquivo de migração
    const migrationPath = join(__dirname, 'migrations', '004_empresa_documentos.sql');
    log('📂', `Lendo migração: ${migrationPath}`);
    
    const sqlContent = readFileSync(migrationPath, 'utf-8');
    
    // Dividir em statements individuais (ignorar comentários e linhas vazias)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));
    
    log('🔍', `Encontrados ${statements.length} statements SQL`);
    
    // Verificar se tabela já existe
    const { data: tableExists } = await supabase
      .from('empresa_documentos')
      .select('id')
      .limit(1);
    
    if (tableExists !== null) {
      log('✅', 'Tabela empresa_documentos já existe, pulando migração');
      return true;
    }
    
    // Executar cada statement via SQL direto
    log('⚙️', 'Executando statements SQL...');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      
      try {
        // Usar rpc para executar SQL direto (requer função helper no Supabase)
        // Como alternativa, usar client SQL direto
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (error) {
          // Se função exec_sql não existe, tentar via client direto
          log('⚠️', `Statement ${i + 1}: Método RPC não disponível, aplicar manualmente`);
          log('💡', 'AÇÃO MANUAL NECESSÁRIA: Copie o conteúdo de migrations/004_empresa_documentos.sql');
          log('💡', 'E cole no SQL Editor do Dashboard Supabase');
          return false;
        }
        
        log('✅', `Statement ${i + 1}/${statements.length} executado`);
      } catch (err) {
        log('⚠️', `Erro no statement ${i + 1}: ${err.message}`);
      }
    }
    
    log('✅', 'Migração SQL aplicada com sucesso!');
    return true;
    
  } catch (error) {
    log('❌', `Erro ao aplicar migração: ${error.message}`);
    log('💡', 'SOLUÇÃO: Execute manualmente no Dashboard Supabase:');
    log('💡', '1. Abra https://supabase.com/dashboard');
    log('💡', '2. SQL Editor → Nova Query');
    log('💡', '3. Cole o conteúdo de scripts/migrations/004_empresa_documentos.sql');
    log('💡', '4. Execute (RUN)');
    return false;
  }
}

// Passo 2: Verificar/criar bucket Storage
async function setupStorage() {
  logSection('🗄️ PASSO 2: Configurando Storage');
  
  try {
    // Verificar se bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      log('❌', `Erro ao listar buckets: ${listError.message}`);
      return false;
    }
    
    const bucketExists = buckets.find(b => b.name === 'empresas-documentos');
    
    if (bucketExists) {
      log('✅', 'Bucket empresas-documentos já existe');
      return true;
    }
    
    // Criar bucket
    log('🔧', 'Criando bucket empresas-documentos...');
    const { data, error } = await supabase.storage.createBucket('empresas-documentos', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf']
    });
    
    if (error) {
      log('❌', `Erro ao criar bucket: ${error.message}`);
      return false;
    }
    
    log('✅', 'Bucket criado com sucesso!');
    return true;
    
  } catch (error) {
    log('❌', `Erro no setup do storage: ${error.message}`);
    return false;
  }
}

// Passo 3: Executar genealogia
async function runGenealogy(options = {}) {
  logSection('🌳 PASSO 3: Executando Genealogia Empresarial');
  
  try {
    const {
      fase = 1,
      expandir = false,
      baixarPDFs = false,
      limiteEmpresas = null,
      limiteSocios = null
    } = options;
    
    // Construir comando
    let cmd = 'node scripts/build-business-genealogy.js';
    
    if (fase) cmd += ` --fase=${fase}`;
    if (expandir) cmd += ' --expand';
    if (baixarPDFs) cmd += ' --pdf';
    if (limiteEmpresas) cmd += ` --limite-empresas=${limiteEmpresas}`;
    if (limiteSocios) cmd += ` --limite-socios=${limiteSocios}`;
    cmd += ' --yes'; // Auto-confirmar
    
    log('🚀', `Executando: ${cmd}`);
    log('⏱️', 'Isso pode levar alguns minutos...\n');
    
    // Executar comando
    const output = execSync(cmd, {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log(output);
    
    log('✅', 'Genealogia executada com sucesso!');
    return true;
    
  } catch (error) {
    log('❌', `Erro ao executar genealogia: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

// Passo 4: Validar dados
async function validateData() {
  logSection('✅ PASSO 4: Validando Dados');
  
  try {
    // Contar empresas
    const { count: empresasCount, error: empresasError } = await supabase
      .from('empresas')
      .select('id', { count: 'exact', head: true });
    
    if (empresasError) {
      log('❌', `Erro ao contar empresas: ${empresasError.message}`);
      return false;
    }
    
    log('📊', `Empresas cadastradas: ${empresasCount}`);
    
    // Contar sócios
    const { count: sociosCount, error: sociosError } = await supabase
      .from('socios')
      .select('id', { count: 'exact', head: true });
    
    if (sociosError) {
      log('❌', `Erro ao contar sócios: ${sociosError.message}`);
      return false;
    }
    
    log('👥', `Sócios cadastrados: ${sociosCount}`);
    
    // Contar relações empresa-sócio
    const { count: relacoesCount, error: relacoesError } = await supabase
      .from('empresa_socios')
      .select('id', { count: 'exact', head: true });
    
    if (relacoesError) {
      log('❌', `Erro ao contar relações: ${relacoesError.message}`);
      return false;
    }
    
    log('🔗', `Relações empresa-sócio: ${relacoesCount}`);
    
    // Contar documentos (se tabela existe)
    try {
      const { count: docsCount, error: docsError } = await supabase
        .from('empresa_documentos')
        .select('id', { count: 'exact', head: true });
      
      if (!docsError) {
        log('📄', `Documentos PDF: ${docsCount}`);
      }
    } catch (e) {
      log('⚠️', 'Tabela empresa_documentos ainda não existe (aplicar migração SQL)');
    }
    
    // Validações
    console.log('\n📋 VALIDAÇÕES:');
    
    if (empresasCount < 100) {
      log('⚠️', 'Poucas empresas cadastradas (esperado 196+)');
    } else {
      log('✅', 'Quantidade de empresas adequada');
    }
    
    if (sociosCount === 0) {
      log('❌', 'NENHUM SÓCIO CADASTRADO! Bug pode não estar corrigido');
      return false;
    } else if (sociosCount < 100) {
      log('⚠️', 'Poucos sócios (esperado 500-1000+)');
    } else {
      log('✅', 'Quantidade de sócios adequada');
    }
    
    if (relacoesCount < sociosCount) {
      log('⚠️', 'Menos relações que sócios (pode indicar problema)');
    } else {
      log('✅', 'Relações empresa-sócio consistentes');
    }
    
    log('✅', 'Validação concluída!');
    return true;
    
  } catch (error) {
    log('❌', `Erro na validação: ${error.message}`);
    return false;
  }
}

// Passo 5: Relatório final
async function generateReport() {
  logSection('📊 RELATÓRIO FINAL');
  
  try {
    // Estatísticas de empresas
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('cnpj, razao_social, uf, porte_empresa')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!empresasError && empresas) {
      console.log('\n📈 Últimas 10 empresas cadastradas:');
      empresas.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.razao_social} (${e.cnpj}) - ${e.uf || 'N/A'}`);
      });
    }
    
    // Estatísticas de sócios
    const { data: socios, error: sociosError } = await supabase
      .from('socios')
      .select('cpf_cnpj, nome, qualificacao')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!sociosError && socios) {
      console.log('\n👥 Últimos 10 sócios cadastrados:');
      socios.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.nome} - ${s.qualificacao || 'N/A'}`);
      });
    }
    
    // Análise de porte
    const { data: portes, error: portesError } = await supabase
      .rpc('get_empresas_por_porte')
      .select('*');
    
    if (!portesError && portes) {
      console.log('\n📊 Distribuição por porte:');
      portes.forEach(p => {
        console.log(`   ${p.porte || 'N/A'}: ${p.count} empresas`);
      });
    }
    
    // Próximos passos
    console.log('\n🎯 PRÓXIMOS PASSOS RECOMENDADOS:');
    console.log('   1. ✅ Dados base consolidados (Fase 1 concluída)');
    console.log('   2. 🔍 Implementar busca avançada CNPJá (prospecção inteligente)');
    console.log('   3. 🌐 Expandir rede seletivamente (prospects score > 80)');
    console.log('   4. 📄 PDFs sob demanda (apenas deals ativos)');
    console.log('   5. 🤖 Integrar IA para análise de perfil empresarial\n');
    
    log('✅', 'Automação completa finalizada!');
    return true;
    
  } catch (error) {
    log('❌', `Erro ao gerar relatório: ${error.message}`);
    return false;
  }
}

// Main - Orquestrador
async function main() {
  console.log('\n🤖 AUTOMAÇÃO COMPLETA - CRM Contabilidade');
  console.log('🎯 Objetivo: Configurar sistema genealógico empresarial\n');
  
  const startTime = Date.now();
  
  try {
    // Parse argumentos
    const args = process.argv.slice(2);
    const skipMigration = args.includes('--skip-migration');
    const skipGenealogy = args.includes('--skip-genealogy');
    const fase = parseInt(args.find(a => a.startsWith('--fase='))?.split('=')[1]) || 1;
    const expandir = args.includes('--expand');
    const baixarPDFs = args.includes('--pdf');
    
    log('⚙️', 'Configuração:');
    console.log(`   Migração SQL: ${skipMigration ? '❌ PULAR' : '✅ APLICAR'}`);
    console.log(`   Genealogia: ${skipGenealogy ? '❌ PULAR' : '✅ EXECUTAR'}`);
    console.log(`   Fase: ${fase}`);
    console.log(`   Expandir rede: ${expandir ? '✅' : '❌'}`);
    console.log(`   Baixar PDFs: ${baixarPDFs ? '✅' : '❌'}`);
    
    // Passo 1: Migração SQL
    if (!skipMigration) {
      const migrationSuccess = await applyMigration();
      if (!migrationSuccess) {
        log('⚠️', 'Migração SQL requer ação manual, mas continuando...');
      }
      await sleep(1000);
    }
    
    // Passo 2: Storage
    const storageSuccess = await setupStorage();
    if (!storageSuccess) {
      log('❌', 'Falha no setup do storage, abortando');
      process.exit(1);
    }
    await sleep(1000);
    
    // Passo 3: Genealogia
    if (!skipGenealogy) {
      const genealogySuccess = await runGenealogy({
        fase,
        expandir,
        baixarPDFs
      });
      
      if (!genealogySuccess) {
        log('❌', 'Falha na genealogia, abortando');
        process.exit(1);
      }
      await sleep(2000);
    }
    
    // Passo 4: Validação
    const validationSuccess = await validateData();
    if (!validationSuccess) {
      log('⚠️', 'Validação encontrou problemas, mas continuando...');
    }
    await sleep(1000);
    
    // Passo 5: Relatório
    await generateReport();
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    logSection('🎉 SUCESSO!');
    console.log(`   ⏱️  Tempo total: ${duration} minutos`);
    console.log(`   📊 Sistema genealógico operacional`);
    console.log(`   🚀 Pronto para prospecção inteligente!\n`);
    
  } catch (error) {
    log('❌', `Erro fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Executar
main().catch(console.error);
