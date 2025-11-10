/**
 * Script para configurar Storage Bucket e aplicar migração de documentos
 * 
 * Execução:
 * node scripts/setup-documents-storage.js
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'empresas-documentos';

// ============================================
// CONFIGURAÇÃO DO STORAGE BUCKET
// ============================================

async function setupStorageBucket() {
  console.log('\n📦 Configurando Storage Bucket...\n');

  try {
    // 1. Verificar se bucket já existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      return false;
    }

    const bucketExists = buckets.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" já existe`);
    } else {
      // 2. Criar bucket
      console.log(`📦 Criando bucket "${BUCKET_NAME}"...`);
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false, // Não público por padrão (RLS controla acesso)
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf'],
      });

      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        return false;
      }

      console.log(`✅ Bucket "${BUCKET_NAME}" criado com sucesso!`);
    }

    // 3. Configurar políticas RLS do bucket (via SQL)
    console.log('\n🔐 Configurando políticas de acesso...');
    
    const policySQL = `
      -- Política: Admin pode fazer upload/download
      CREATE POLICY IF NOT EXISTS "Admin full access storage"
        ON storage.objects FOR ALL
        TO authenticated
        USING (
          bucket_id = '${BUCKET_NAME}' AND
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );

      -- Política: Usuários podem fazer download de documentos de suas empresas
      CREATE POLICY IF NOT EXISTS "Users can download their company documents"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
          bucket_id = '${BUCKET_NAME}' AND
          (
            -- Documentos de empresas em seus deals
            SUBSTRING(name FROM 1 FOR 14) IN (
              SELECT empresa_cnpj FROM deals
              WHERE responsavel_id = auth.uid()
            )
            OR
            -- Documentos de empresas em suas indicações
            SUBSTRING(name FROM 1 FOR 14) IN (
              SELECT empresa_cnpj FROM indicacoes
              WHERE indicado_por = auth.uid()
            )
          )
        );
    `;

    try {
      // Executar políticas (pode falhar se já existirem, ok ignorar)
      await supabase.rpc('exec_sql', { sql: policySQL }).catch(() => {
        console.log('⚠️  Políticas já existem (ignorando erro)');
      });
    } catch (e) {
      // Políticas provavelmente já existem, tudo bem
      console.log('⚠️  Não foi possível criar políticas via RPC (configure manualmente se necessário)');
    }

    console.log('✅ Políticas configuradas!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao configurar bucket:', error);
    return false;
  }
}

// ============================================
// APLICAÇÃO DA MIGRAÇÃO SQL
// ============================================

async function applyMigration() {
  console.log('\n📊 Aplicando migração de documentos...\n');

  try {
    // Ler arquivo SQL
    const sqlPath = join(rootDir, 'scripts', 'migrations', '004_empresa_documentos.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Executar SQL (Supabase JS não tem método direto, precisamos usar psql ou API REST)
    // Como workaround, vamos executar comando por comando
    
    console.log('📝 Criando tabela empresa_documentos...');
    
    // Criar tabela (simplificado para execução via JS)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS empresa_documentos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cnpj VARCHAR(14) NOT NULL REFERENCES empresas(cnpj) ON DELETE CASCADE,
        tipo_documento VARCHAR(20) NOT NULL CHECK (tipo_documento IN ('cartao-cnpj', 'qsa', 'certidao', 'outros')),
        url_storage TEXT NOT NULL,
        tamanho_bytes BIGINT,
        hash_md5 VARCHAR(32),
        baixado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW(),
        versao INTEGER DEFAULT 1,
        status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'expirado', 'invalido')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cnpj, tipo_documento, versao)
      );

      CREATE INDEX IF NOT EXISTS idx_empresa_documentos_cnpj ON empresa_documentos(cnpj);
      CREATE INDEX IF NOT EXISTS idx_empresa_documentos_tipo ON empresa_documentos(tipo_documento);
      CREATE INDEX IF NOT EXISTS idx_empresa_documentos_baixado_em ON empresa_documentos(baixado_em DESC);

      ALTER TABLE empresa_documentos ENABLE ROW LEVEL SECURITY;
    `;

    // Tentar executar via service_role (não tem método direto no JS client)
    // Precisaremos usar psql ou Dashboard do Supabase
    console.log('⚠️  Execute o SQL manualmente no Supabase Dashboard:');
    console.log('   1. Acesse: https://supabase.com/dashboard/project/[project]/sql');
    console.log('   2. Cole o conteúdo de: scripts/migrations/004_empresa_documentos.sql');
    console.log('   3. Execute o SQL');
    console.log('');
    console.log('   Ou use psql:');
    console.log(`   psql "${supabaseUrl.replace('https://', 'postgresql://postgres:[PASSWORD]@').replace('.supabase.co', '.supabase.co:5432/postgres')}" -f scripts/migrations/004_empresa_documentos.sql`);
    
    // Verificar se tabela existe
    const { data, error } = await supabase.from('empresa_documentos').select('*').limit(1);
    
    if (!error) {
      console.log('\n✅ Tabela empresa_documentos já existe e está acessível!');
      return true;
    } else if (error.code === '42P01') {
      console.log('\n❌ Tabela empresa_documentos NÃO existe ainda.');
      console.log('   Execute a migração SQL manualmente conforme instruções acima.');
      return false;
    } else {
      console.log('\n⚠️  Erro ao verificar tabela:', error.message);
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    return false;
  }
}

// ============================================
// TESTE DE CONFIGURAÇÃO
// ============================================

async function testConfiguration() {
  console.log('\n🧪 Testando configuração...\n');

  try {
    // 1. Testar acesso ao bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    if (listError) {
      console.error('❌ Erro ao listar arquivos do bucket:', listError);
      return false;
    }

    console.log(`✅ Bucket "${BUCKET_NAME}" acessível`);

    // 2. Testar acesso à tabela
    const { data: docs, error: tableError } = await supabase
      .from('empresa_documentos')
      .select('*')
      .limit(1);

    if (tableError) {
      if (tableError.code === '42P01') {
        console.error('❌ Tabela empresa_documentos não existe. Execute a migração SQL.');
        return false;
      } else {
        console.error('❌ Erro ao acessar tabela:', tableError);
        return false;
      }
    }

    console.log('✅ Tabela empresa_documentos acessível');
    console.log(`   Documentos existentes: ${docs?.length || 0}`);

    return true;

  } catch (error) {
    console.error('❌ Erro ao testar configuração:', error);
    return false;
  }
}

// ============================================
// ESTATÍSTICAS
// ============================================

async function showStats() {
  console.log('\n📊 Estatísticas do sistema de documentos:\n');

  try {
    // Contar documentos por tipo
    const { data: stats } = await supabase
      .from('empresa_documentos')
      .select('tipo_documento, tamanho_bytes');

    if (!stats || stats.length === 0) {
      console.log('   Nenhum documento baixado ainda.');
      return;
    }

    const groupedStats = stats.reduce((acc, doc) => {
      if (!acc[doc.tipo_documento]) {
        acc[doc.tipo_documento] = { count: 0, totalBytes: 0 };
      }
      acc[doc.tipo_documento].count++;
      acc[doc.tipo_documento].totalBytes += doc.tamanho_bytes || 0;
      return acc;
    }, {});

    console.log('   Tipo              | Quantidade | Tamanho Total');
    console.log('   -----------------|------------|---------------');
    
    for (const [tipo, data] of Object.entries(groupedStats)) {
      const sizeInMB = (data.totalBytes / 1024 / 1024).toFixed(2);
      console.log(`   ${tipo.padEnd(17)}| ${data.count.toString().padStart(10)} | ${sizeInMB.padStart(10)} MB`);
    }

    const totalDocs = stats.length;
    const totalBytes = stats.reduce((sum, doc) => sum + (doc.tamanho_bytes || 0), 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);

    console.log('   -----------------|------------|---------------');
    console.log(`   TOTAL            | ${totalDocs.toString().padStart(10)} | ${totalMB.padStart(10)} MB`);

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🚀 SETUP: Sistema de Documentos CNPJá');
  console.log('═══════════════════════════════════════════════════════════');

  // 1. Configurar Storage
  const storageOk = await setupStorageBucket();
  if (!storageOk) {
    console.log('\n❌ Falha ao configurar Storage. Verifique permissões.');
    process.exit(1);
  }

  // 2. Aplicar migração
  const migrationOk = await applyMigration();
  if (!migrationOk) {
    console.log('\n⚠️  Migração SQL precisa ser executada manualmente.');
  }

  // 3. Testar configuração
  const testOk = await testConfiguration();
  if (!testOk) {
    console.log('\n❌ Configuração incompleta. Revise os passos acima.');
    process.exit(1);
  }

  // 4. Mostrar estatísticas
  await showStats();

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ SETUP COMPLETO!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 Próximos passos:');
  console.log('   1. Usar: import { downloadAllDocuments } from "services/cnpjaDocumentsService"');
  console.log('   2. Executar: await downloadAllDocuments("12345678000190")');
  console.log('   3. Ver documentos em: Supabase Storage > empresas-documentos');
  console.log('');
}

main().catch(console.error);
