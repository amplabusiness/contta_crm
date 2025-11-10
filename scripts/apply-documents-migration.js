/**
 * Script para aplicar migração empresa_documentos via service_role
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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

async function applyMigration() {
  console.log('📊 Aplicando migração empresa_documentos...\n');

  try {
    // SQL simplificado para execução via JavaScript
    // Nota: Supabase JS não tem método direto para executar DDL
    // Vamos criar a tabela usando uma abordagem alternativa

    console.log('⚠️  ATENÇÃO: Supabase JS não suporta execução direta de DDL.');
    console.log('   Você precisa executar o SQL manualmente via Dashboard.\n');
    console.log('📝 Passos para aplicar a migração:\n');
    console.log('   1. Acesse: https://supabase.com/dashboard');
    console.log('   2. Selecione seu projeto');
    console.log('   3. Vá em: SQL Editor');
    console.log('   4. Cole e execute o seguinte SQL:\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const sql = `
-- Criar tabela empresa_documentos
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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_cnpj ON empresa_documentos(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_tipo ON empresa_documentos(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_baixado_em ON empresa_documentos(baixado_em DESC);

-- Habilitar RLS
ALTER TABLE empresa_documentos ENABLE ROW LEVEL SECURITY;

-- Política: Admin full access
CREATE POLICY IF NOT EXISTS "Admin pode gerenciar documentos"
  ON empresa_documentos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Usuários podem visualizar documentos de suas empresas
CREATE POLICY IF NOT EXISTS "Usuários podem visualizar documentos"
  ON empresa_documentos
  FOR SELECT
  TO authenticated
  USING (
    cnpj IN (
      SELECT empresa_cnpj FROM deals
      WHERE responsavel_id = auth.uid()
    )
    OR
    cnpj IN (
      SELECT empresa_cnpj FROM indicacoes
      WHERE indicado_por = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_empresa_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_empresa_documentos_updated_at
  BEFORE UPDATE ON empresa_documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_empresa_documentos_updated_at();
`;

    console.log(sql);
    console.log('\n═══════════════════════════════════════════════════════════\n');

    console.log('   5. Aguarde confirmação de sucesso');
    console.log('   6. Execute novamente: node scripts/setup-documents-storage.js\n');

    // Tentar verificar se já foi aplicado
    const { data, error } = await supabase.from('empresa_documentos').select('*').limit(1);

    if (!error) {
      console.log('✅ Migração JÁ aplicada! Tabela empresa_documentos existe.\n');
      return true;
    } else if (error.code === 'PGRST205') {
      console.log('❌ Migração PENDENTE. Execute o SQL acima no Dashboard.\n');
      return false;
    } else {
      console.log('⚠️  Status desconhecido:', error.message, '\n');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

applyMigration();
