-- ============================================
-- MIGRAÇÃO: Sistema de Documentos CNPJá
-- ============================================
-- Autor: Sistema de Genealogia Empresarial
-- Data: 2025-01-09
-- Objetivo: Armazenar PDFs (Cartão CNPJ, QSA, Certidões) no Supabase Storage

-- ============================================
-- 1. TABELA DE DOCUMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS empresa_documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cnpj VARCHAR(14) NOT NULL REFERENCES empresas(cnpj) ON DELETE CASCADE,
  tipo_documento VARCHAR(20) NOT NULL CHECK (tipo_documento IN ('cartao-cnpj', 'qsa', 'certidao', 'outros')),
  url_storage TEXT NOT NULL, -- URL pública do Supabase Storage
  tamanho_bytes BIGINT, -- Tamanho do arquivo em bytes
  hash_md5 VARCHAR(32), -- Hash MD5 para validação de integridade
  baixado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  
  -- Metadados adicionais
  versao INTEGER DEFAULT 1, -- Versão do documento (se foi baixado múltiplas vezes)
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'expirado', 'invalido')),
  
  -- Índices
  UNIQUE(cnpj, tipo_documento, versao),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_cnpj ON empresa_documentos(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_tipo ON empresa_documentos(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_baixado_em ON empresa_documentos(baixado_em DESC);

-- Comentários
COMMENT ON TABLE empresa_documentos IS 'Registro de documentos PDF baixados da API CNPJá e armazenados no Supabase Storage';
COMMENT ON COLUMN empresa_documentos.tipo_documento IS 'Tipo: cartao-cnpj (Comprovante Inscrição), qsa (Quadro Sócios), certidao (Certidão Simplificada)';
COMMENT ON COLUMN empresa_documentos.url_storage IS 'URL pública do arquivo no bucket empresas-documentos';
COMMENT ON COLUMN empresa_documentos.versao IS 'Versão do documento - incrementa a cada re-download';

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE empresa_documentos ENABLE ROW LEVEL SECURITY;

-- Política: Admin full access
CREATE POLICY "Admin pode gerenciar documentos"
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

-- Política: Usuários podem visualizar documentos de empresas que acompanham
CREATE POLICY "Usuários podem visualizar documentos de suas empresas"
  ON empresa_documentos
  FOR SELECT
  TO authenticated
  USING (
    -- Se a empresa pertence a algum deal do usuário
    cnpj IN (
      SELECT empresa_cnpj FROM deals
      WHERE responsavel_id = auth.uid()
    )
    OR
    -- Ou se a empresa está em indicações do usuário
    cnpj IN (
      SELECT empresa_cnpj FROM indicacoes
      WHERE indicado_por = auth.uid()
    )
  );

-- ============================================
-- 3. TRIGGERS PARA AUDITORIA
-- ============================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_empresa_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_empresa_documentos_updated_at
  BEFORE UPDATE ON empresa_documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_empresa_documentos_updated_at();

-- ============================================
-- 4. FUNÇÕES AUXILIARES
-- ============================================

-- Função para obter último documento de um tipo
CREATE OR REPLACE FUNCTION get_latest_document(p_cnpj VARCHAR(14), p_tipo VARCHAR(20))
RETURNS TABLE(
  id UUID,
  url_storage TEXT,
  tamanho_bytes BIGINT,
  baixado_em TIMESTAMP,
  versao INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ed.id,
    ed.url_storage,
    ed.tamanho_bytes,
    ed.baixado_em,
    ed.versao
  FROM empresa_documentos ed
  WHERE ed.cnpj = p_cnpj
    AND ed.tipo_documento = p_tipo
    AND ed.status = 'ativo'
  ORDER BY ed.versao DESC, ed.baixado_em DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_document IS 'Retorna a versão mais recente de um documento específico';

-- Função para estatísticas de documentos
CREATE OR REPLACE FUNCTION get_documentos_stats()
RETURNS TABLE(
  tipo_documento VARCHAR(20),
  total_documentos BIGINT,
  total_bytes BIGINT,
  media_bytes BIGINT,
  ultimo_download TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ed.tipo_documento,
    COUNT(*)::BIGINT as total_documentos,
    SUM(ed.tamanho_bytes)::BIGINT as total_bytes,
    AVG(ed.tamanho_bytes)::BIGINT as media_bytes,
    MAX(ed.baixado_em) as ultimo_download
  FROM empresa_documentos ed
  WHERE ed.status = 'ativo'
  GROUP BY ed.tipo_documento
  ORDER BY total_documentos DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_documentos_stats IS 'Estatísticas de documentos por tipo';

-- ============================================
-- 5. VIEWS ÚTEIS
-- ============================================

-- View: Documentos com informações da empresa
CREATE OR REPLACE VIEW v_empresa_documentos_completo AS
SELECT 
  ed.id,
  ed.cnpj,
  e.razao_social,
  e.nome_fantasia,
  e.situacao_cadastral,
  ed.tipo_documento,
  ed.url_storage,
  ed.tamanho_bytes,
  ROUND(ed.tamanho_bytes / 1024.0, 2) as tamanho_kb,
  ed.baixado_em,
  ed.versao,
  ed.status,
  -- Indicador se documento está desatualizado (>90 dias)
  CASE 
    WHEN ed.baixado_em < NOW() - INTERVAL '90 days' THEN true
    ELSE false
  END as precisa_atualizar
FROM empresa_documentos ed
JOIN empresas e ON e.cnpj = ed.cnpj
WHERE ed.status = 'ativo';

COMMENT ON VIEW v_empresa_documentos_completo IS 'View completa de documentos com informações da empresa e indicadores de atualização';

-- ============================================
-- 6. CONFIGURAÇÃO INICIAL
-- ============================================

-- Inserir metadados sobre storage bucket (referência)
COMMENT ON DATABASE postgres IS 'Storage Bucket: empresas-documentos | Estrutura: {cnpj}/{tipo}.pdf | Max size: 10MB/file';

-- ============================================
-- 7. GRANTS (PERMISSÕES)
-- ============================================

-- Permitir que funções sejam executadas por usuários autenticados
GRANT EXECUTE ON FUNCTION get_latest_document TO authenticated;
GRANT EXECUTE ON FUNCTION get_documentos_stats TO authenticated;

-- Permitir acesso à view
GRANT SELECT ON v_empresa_documentos_completo TO authenticated;

-- ============================================
-- FINALIZAÇÃO
-- ============================================

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela empresa_documentos criada';
  RAISE NOTICE '✅ RLS configurado';
  RAISE NOTICE '✅ Triggers criados';
  RAISE NOTICE '✅ Funções auxiliares criadas';
  RAISE NOTICE '✅ Views criadas';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Próximo passo: Configurar Storage Bucket no Supabase Dashboard';
  RAISE NOTICE '   1. Acesse: https://supabase.com/dashboard/project/[project]/storage/buckets';
  RAISE NOTICE '   2. Criar bucket: empresas-documentos';
  RAISE NOTICE '   3. Configurar: Public = false, File size limit = 10MB';
  RAISE NOTICE '   4. Adicionar políticas RLS no bucket';
END $$;
