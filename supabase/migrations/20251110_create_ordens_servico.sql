-- Migration: Criar tabela ordens_servico
-- Objetivo: Rastrear ordens de serviço geradas automaticamente (ex: migração EIRELI→SLU)
-- Data: 2025-11-10

-- Criar tabela ordens_servico
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cnpj TEXT NOT NULL REFERENCES public.empresas(cnpj) ON DELETE CASCADE,
  empresa_nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- Ex: 'MIGRACAO_EIRELI_SLU', 'ALTERACAO_CONTRATO', etc
  descricao TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'Média', -- 'Alta', 'Média', 'Baixa'
  status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Em Andamento', 'Concluída', 'Cancelada'
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_conclusao TIMESTAMPTZ,
  valor_estimado NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_ordens_servico_empresa_cnpj 
ON public.ordens_servico(empresa_cnpj);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_tipo 
ON public.ordens_servico(tipo);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_status 
ON public.ordens_servico(status);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_assignee 
ON public.ordens_servico(assignee_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ordens_servico_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários descritivos
COMMENT ON TABLE public.ordens_servico IS 
'Ordens de serviço geradas automaticamente ou manualmente para clientes. Usada pelos scripts de automação (213-5, etc).';

COMMENT ON COLUMN public.ordens_servico.tipo IS 
'Tipo da ordem de serviço. Exemplos: MIGRACAO_EIRELI_SLU, ALTERACAO_CONTRATO, REGULARIZACAO_FISCAL';

COMMENT ON COLUMN public.ordens_servico.status IS 
'Status atual: Pendente, Em Andamento, Concluída, Cancelada';

-- RLS (Row Level Security)
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ver todas as ordens
CREATE POLICY "Usuários autenticados podem visualizar ordens de serviço"
ON public.ordens_servico
FOR SELECT
TO authenticated
USING (true);

-- Policy: Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Apenas admins podem gerenciar ordens de serviço"
ON public.ordens_servico
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- Mostrar resumo
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela ordens_servico criada com sucesso!';
  RAISE NOTICE 'Índices: 4 criados';
  RAISE NOTICE 'Triggers: 1 (update_updated_at)';
  RAISE NOTICE 'RLS: Habilitado com 2 policies';
END $$;
