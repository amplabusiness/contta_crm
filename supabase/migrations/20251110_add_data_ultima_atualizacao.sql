-- Migration: Adicionar campo data_ultima_atualizacao na tabela empresas
-- Objetivo: Rastrear quando cada empresa foi atualizada pela última vez via CNPJá API
-- Data: 2025-11-10

-- Adicionar coluna data_ultima_atualizacao
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS data_ultima_atualizacao TIMESTAMPTZ;

-- Comentário descritivo
COMMENT ON COLUMN public.empresas.data_ultima_atualizacao IS 
'Data/hora da última atualização dos dados da empresa via CNPJá API. Usado pelo script update-cnpja-cache.ts para identificar registros desatualizados (> 90 dias).';

-- Atualizar registros existentes com a data de criação (fallback)
UPDATE public.empresas 
SET data_ultima_atualizacao = created_at 
WHERE data_ultima_atualizacao IS NULL;

-- Criar índice para otimizar queries de empresas desatualizadas
CREATE INDEX IF NOT EXISTS idx_empresas_data_ultima_atualizacao 
ON public.empresas(data_ultima_atualizacao);

-- Mostrar resumo
DO $$
DECLARE
  total_empresas INTEGER;
  sem_atualizacao INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_empresas FROM public.empresas;
  SELECT COUNT(*) INTO sem_atualizacao FROM public.empresas WHERE data_ultima_atualizacao IS NULL;
  
  RAISE NOTICE '✅ Migration concluída!';
  RAISE NOTICE 'Total de empresas: %', total_empresas;
  RAISE NOTICE 'Sem data de atualização: %', sem_atualizacao;
END $$;
