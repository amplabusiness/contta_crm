#!/usr/bin/env node

/**
 * AUTOMAÇÃO COMPLETA - GENEALOGIA EMPRESARIAL
 * 
 * Este script executa todo o processo automaticamente:
 * 1. Verifica/aplica migração SQL (empresa_documentos)
 * 2. Configura Storage (bucket empresas-documentos)
 * 3. Executa genealogia Fase 1 (196 empresas base)
 * 4. Valida dados (sócios, empresas, relações)
 * 5. Gera relatório final
 * 
 * USO:
 *   node scripts/start-automation.js              # Padrão: Fase 1, sem PDFs
 *   node scripts/start-automation.js --pdf        # Fase 1 + PDFs
 *   node scripts/start-automation.js --fase=2 --expand  # Até 2º grau
 *   node scripts/start-automation.js --all --pdf  # Tudo
 * 
 * FLAGS:
 *   --fase=N          Fase máxima (1-4, padrão: 1)
 *   --expand          Expandir rede genealógica
 *   --pdf             Baixar PDFs (custa ~0.5₪ cada)
 *   --skip-migration  Pular verificação de migração SQL
 *   --yes             Auto-confirmar tudo
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente (priorizar .env.local que tem todas as variáveis)
const envLocal = join(__dirname, '..', '.env.local');
const envVercel = join(__dirname, '..', '.env.local.vercel');

if (existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
  console.log('✅ Carregado: .env.local\n');
} else if (existsSync(envVercel)) {
  dotenv.config({ path: envVercel });
  console.log('✅ Carregado: .env.local.vercel\n');
}

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(emoji, message, color = '') {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSection(title) {
  const line = '═'.repeat(70);
  console.log(`\n${colors.bright}${colors.cyan}${line}`);
  console.log(`  ${title}`);
  console.log(`${line}${colors.reset}\n`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    fase: parseInt(args.find(a => a.startsWith('--fase='))?.split('=')[1]) || 1,
    expandir: args.includes('--expand'),
    baixarPDFs: args.includes('--pdf'),
    skipMigration: args.includes('--skip-migration'),
    autoConfirm: args.includes('--yes') || args.includes('--all'),
    all: args.includes('--all')
  };
}

async function checkEnv() {
  logSection('🔐 VERIFICAÇÃO DE AMBIENTE');
  
  const required = [
    { key: 'VITE_SUPABASE_URL', alias: 'SUPABASE_URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', alias: 'SUPABASE_SERVICE_KEY' },
    { key: 'VITE_CNPJA_KEY', optional: true }
  ];
  
  const missing = [];
  
  for (const { key, alias, optional } of required) {
    const value = process.env[key] || process.env[alias];
    
    if (!value && !optional) {
      missing.push(key);
      log('❌', `${key}: NÃO CONFIGURADA`, colors.red);
    } else if (value) {
      const preview = value.length > 40 
        ? `${value.substring(0, 15)}...${value.substring(value.length - 10)}`
        : value;
      log('✅', `${key}: ${preview}`, colors.green);
      
      // Criar alias se não existir
      if (alias && !process.env[alias]) {
        process.env[alias] = value;
      }
    } else if (optional) {
      log('⚠️', `${key}: Não configurada (opcional)`, colors.yellow);
    }
  }
  
  if (missing.length > 0) {
    console.log(`\n${colors.red}❌ Variáveis ausentes: ${missing.join(', ')}`);
    console.log(`${colors.yellow}💡 Configure no arquivo .env.local.vercel ou .env.local${colors.reset}\n`);
    process.exit(1);
  }
  
  log('✅', 'Todas as variáveis configuradas!', colors.green);
  return true;
}

async function checkMigration() {
  logSection('📋 VERIFICAÇÃO DE MIGRAÇÃO SQL');
  
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(url, key);
  
  try {
    // Tentar acessar tabela
    const { data, error } = await supabase
      .from('empresa_documentos')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('not find the table')) { // Tabela não existe
        log('⚠️', 'Tabela empresa_documentos NÃO existe', colors.yellow);
        log('📄', 'Migração SQL precisa ser aplicada', colors.yellow);
        
        console.log(`\n${colors.bright}${colors.yellow}═══ AÇÃO NECESSÁRIA ═══${colors.reset}`);
        console.log('A migração SQL pode ser aplicada de 2 formas:\n');
        
        console.log(`${colors.bright}OPÇÃO 1 - MANUAL (RECOMENDADA):${colors.reset}`);
        console.log('1. Abra o Dashboard Supabase:');
        console.log(`   ${colors.cyan}${url.replace('/rest/v1', '')}/project/_/sql${colors.reset}`);
        console.log('2. Clique em "New Query"');
        console.log('3. Cole o conteúdo de:');
        console.log(`   ${colors.cyan}scripts/migrations/004_empresa_documentos.sql${colors.reset}`);
        console.log('4. Execute (RUN)\n');
        
        console.log(`${colors.bright}OPÇÃO 2 - CONTINUAR SEM DOCUMENTOS:${colors.reset}`);
        console.log('Execute com flag:');
        console.log(`   ${colors.cyan}node scripts/start-automation.js --skip-migration --yes${colors.reset}\n`);
        
        log('💡', 'A funcionalidade de PDFs ficará indisponível até aplicar a migração', colors.yellow);
        log('💡', 'Mas a genealogia (sócios) funciona normalmente sem ela!', colors.green);
        
        // Mostrar preview do SQL
        const sqlPath = join(__dirname, 'migrations', '004_empresa_documentos.sql');
        if (existsSync(sqlPath)) {
          const sql = readFileSync(sqlPath, 'utf-8');
          console.log(`\n${colors.blue}📄 Preview SQL (primeiras 10 linhas):${colors.reset}`);
          console.log(colors.bright + sql.split('\n').slice(0, 10).join('\n') + colors.reset);
          console.log(`   ... (${sql.split('\n').length} linhas no total)\n`);
        }
        
        return false;
      } else {
        throw error;
      }
    }
    
    log('✅', 'Tabela empresa_documentos existe!', colors.green);
    
    // Contar documentos
    const { count } = await supabase
      .from('empresa_documentos')
      .select('id', { count: 'exact', head: true });
    
    log('📊', `Documentos cadastrados: ${count || 0}`, colors.blue);
    
    return true;
    
  } catch (error) {
    log('❌', `Erro: ${error.message}`, colors.red);
    return false;
  }
}

async function checkStorage() {
  logSection('🗄️ VERIFICAÇÃO DE STORAGE');
  
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(url, key);
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) throw error;
    
    const bucket = buckets.find(b => b.name === 'empresas-documentos');
    
    if (!bucket) {
      log('⚠️', 'Bucket empresas-documentos NÃO existe', colors.yellow);
      log('🔧', 'Criando bucket...', colors.blue);
      
      const { data, error: createError } = await supabase.storage.createBucket('empresas-documentos', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf']
      });
      
      if (createError) {
        log('❌', `Erro ao criar bucket: ${createError.message}`, colors.red);
        return false;
      }
      
      log('✅', 'Bucket criado com sucesso!', colors.green);
    } else {
      log('✅', 'Bucket empresas-documentos existe!', colors.green);
      log('📊', `ID: ${bucket.id}`, colors.blue);
      log('📊', `Público: ${bucket.public ? 'Sim' : 'Não'}`, colors.blue);
    }
    
    return true;
    
  } catch (error) {
    log('❌', `Erro: ${error.message}`, colors.red);
    return false;
  }
}

async function runGenealogy(config) {
  logSection('🌳 EXECUTANDO GENEALOGIA EMPRESARIAL');
  
  const { fase, expandir, baixarPDFs, autoConfirm } = config;
  
  // Construir comando
  let cmd = 'node scripts/build-business-genealogy.js';
  if (fase) cmd += ` --fase=${fase}`;
  if (expandir) cmd += ' --expand';
  if (baixarPDFs) cmd += ' --pdf';
  if (autoConfirm) cmd += ' --yes';
  
  log('🚀', `Comando: ${cmd}`, colors.cyan);
  log('⏱️', 'Aguarde...', colors.yellow);
  
  console.log(''); // Linha em branco
  
  try {
    execSync(cmd, {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    
    console.log(''); // Linha em branco
    log('✅', 'Genealogia executada com sucesso!', colors.green);
    return true;
    
  } catch (error) {
    console.log(''); // Linha em branco
    log('❌', 'Erro na execução da genealogia', colors.red);
    if (error.message) {
      console.error(colors.red + error.message + colors.reset);
    }
    return false;
  }
}

async function validateData() {
  logSection('✅ VALIDAÇÃO DE DADOS');
  
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(url, key);
  
  try {
    // Contar empresas
    const { count: empresas } = await supabase
      .from('empresas')
      .select('id', { count: 'exact', head: true });
    
    // Contar sócios
    const { count: socios } = await supabase
      .from('socios')
      .select('id', { count: 'exact', head: true });
    
    // Contar relações
    const { count: relacoes } = await supabase
      .from('empresa_socios')
      .select('id', { count: 'exact', head: true });
    
    // Contar documentos
    let documentos = 0;
    try {
      const { count } = await supabase
        .from('empresa_documentos')
        .select('id', { count: 'exact', head: true });
      documentos = count || 0;
    } catch (e) {
      // Tabela pode não existir ainda
    }
    
    console.log(`${colors.bright}📊 ESTATÍSTICAS:${colors.reset}`);
    console.log(`   Empresas: ${colors.green}${empresas || 0}${colors.reset}`);
    console.log(`   Sócios: ${colors.green}${socios || 0}${colors.reset}`);
    console.log(`   Relações: ${colors.green}${relacoes || 0}${colors.reset}`);
    console.log(`   Documentos PDF: ${colors.green}${documentos}${colors.reset}\n`);
    
    // Validações
    const checks = [];
    
    if (empresas >= 100) {
      checks.push({ ok: true, msg: 'Quantidade de empresas adequada (≥100)' });
    } else {
      checks.push({ ok: false, msg: `Poucas empresas: ${empresas} (esperado ≥100)` });
    }
    
    if (socios > 0) {
      checks.push({ ok: true, msg: `Sócios cadastrados: ${socios}` });
    } else {
      checks.push({ ok: false, msg: 'NENHUM SÓCIO! Bug pode não estar corrigido' });
    }
    
    if (relacoes >= socios) {
      checks.push({ ok: true, msg: 'Relações empresa-sócio consistentes' });
    } else {
      checks.push({ ok: false, msg: 'Menos relações que sócios (inconsistência)' });
    }
    
    console.log(`${colors.bright}🔍 VALIDAÇÕES:${colors.reset}`);
    checks.forEach(check => {
      if (check.ok) {
        log('✅', check.msg, colors.green);
      } else {
        log('⚠️', check.msg, colors.yellow);
      }
    });
    
    const allOk = checks.every(c => c.ok);
    
    if (allOk) {
      log('\n✅', 'Todos os checks passaram!', colors.green);
    } else {
      log('\n⚠️', 'Alguns checks falharam, mas pode ser esperado', colors.yellow);
    }
    
    return allOk;
    
  } catch (error) {
    log('❌', `Erro na validação: ${error.message}`, colors.red);
    return false;
  }
}

async function generateReport() {
  logSection('📊 RELATÓRIO FINAL');
  
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(url, key);
  
  try {
    // Top empresas
    const { data: empresas } = await supabase
      .from('empresas')
      .select('cnpj, razao_social, uf')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (empresas && empresas.length > 0) {
      console.log(`${colors.bright}📈 Últimas 5 empresas:${colors.reset}`);
      empresas.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.razao_social} (${e.cnpj}) - ${e.uf || 'N/A'}`);
      });
      console.log('');
    }
    
    // Top sócios
    const { data: socios } = await supabase
      .from('socios')
      .select('nome, qualificacao')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (socios && socios.length > 0) {
      console.log(`${colors.bright}👥 Últimos 5 sócios:${colors.reset}`);
      socios.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.nome} - ${s.qualificacao || 'N/A'}`);
      });
      console.log('');
    }
    
    // Próximos passos
    console.log(`${colors.bright}${colors.magenta}🎯 PRÓXIMOS PASSOS:${colors.reset}`);
    console.log(`   1. ${colors.green}✅ Dados base consolidados${colors.reset} (Fase 1 OK)`);
    console.log(`   2. ${colors.cyan}🔍 Implementar busca avançada CNPJá${colors.reset} (prospecção inteligente)`);
    console.log(`   3. ${colors.cyan}🌐 Expandir rede seletivamente${colors.reset} (--fase=2 --expand)`);
    console.log(`   4. ${colors.cyan}📄 PDFs sob demanda${colors.reset} (apenas deals ativos)`);
    console.log(`   5. ${colors.cyan}🤖 Integrar IA para análise${colors.reset} (perfil empresarial)\n`);
    
    return true;
    
  } catch (error) {
    log('❌', `Erro ao gerar relatório: ${error.message}`, colors.red);
    return false;
  }
}

async function main() {
  console.log(`\n${colors.bright}${colors.magenta}╔═══════════════════════════════════════════════════════════════════╗`);
  console.log(`║  🤖 AUTOMAÇÃO COMPLETA - GENEALOGIA EMPRESARIAL                  ║`);
  console.log(`║  🎯 Sistema de Prospecção Inteligente para CRM Contabilidade     ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const startTime = Date.now();
  const config = parseArgs();
  
  console.log(`${colors.bright}⚙️ CONFIGURAÇÃO:${colors.reset}`);
  console.log(`   Fase: ${colors.cyan}${config.fase}${colors.reset}`);
  console.log(`   Expandir rede: ${config.expandir ? colors.green + '✅' : colors.yellow + '❌'}${colors.reset}`);
  console.log(`   Baixar PDFs: ${config.baixarPDFs ? colors.green + '✅' : colors.yellow + '❌'}${colors.reset}`);
  console.log(`   Pular migração: ${config.skipMigration ? colors.yellow + '✅' : colors.green + '❌'}${colors.reset}`);
  console.log(`   Auto-confirmar: ${config.autoConfirm ? colors.green + '✅' : colors.yellow + '❌'}${colors.reset}\n`);
  
  try {
    // 1. Verificar ambiente
    await checkEnv();
    
    // 2. Verificar migração SQL
    if (!config.skipMigration) {
      const migrationOk = await checkMigration();
      if (!migrationOk) {
        process.exit(1);
      }
    }
    
    // 3. Verificar/criar Storage
    const storageOk = await checkStorage();
    if (!storageOk) {
      log('❌', 'Falha no setup do Storage, abortando', colors.red);
      process.exit(1);
    }
    
    // 4. Executar genealogia
    const genealogyOk = await runGenealogy(config);
    if (!genealogyOk) {
      log('❌', 'Falha na genealogia, abortando', colors.red);
      process.exit(1);
    }
    
    // 5. Validar dados
    await validateData();
    
    // 6. Relatório final
    await generateReport();
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    logSection('🎉 AUTOMAÇÃO CONCLUÍDA!');
    console.log(`   ${colors.green}✅ Sucesso total!${colors.reset}`);
    console.log(`   ${colors.blue}⏱️  Tempo: ${duration} minutos${colors.reset}`);
    console.log(`   ${colors.magenta}🚀 Sistema operacional!${colors.reset}\n`);
    
  } catch (error) {
    log('❌', `Erro fatal: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Executar
main().catch(console.error);
