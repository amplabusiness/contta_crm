import React, { useState, useCallback, useEffect } from 'react';

/**
 * Hook para busca automática de dados de empresa por CNPJ
 * 
 * Funcionalidades:
 * - Detecta quando CNPJ está completo (14 dígitos)
 * - Busca dados na API CNPJá automaticamente
 * - Popula sócios da empresa
 * - Gerencia estados de loading/error
 * - Cache inteligente (Supabase + localStorage)
 * 
 * @example
 * const { 
 *   empresa, 
 *   loading, 
 *   error, 
 *   lookupCNPJ 
 * } = useCNPJLookup();
 * 
 * // Dispara busca
 * lookupCNPJ('00000000000191');
 */

export interface Socio {
  cpf_cnpj: string;
  nome: string;
  qualificacao: string;
  data_entrada?: string;
  percentual_capital?: number;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

export interface EmpresaData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  cnae_principal?: string;
  descricao_cnae?: string;
  natureza_juridica?: string;
  porte_empresa?: string;
  capital_social?: number;
  data_abertura?: string;
  situacao_cadastral?: string;
  endereco?: Endereco;
  telefone?: string;
  email?: string;
  socios?: Socio[];
}

interface UseCNPJLookupReturn {
  empresa: EmpresaData | null;
  socios: Socio[];
  loading: boolean;
  error: string | null;
  lookupCNPJ: (cnpj: string) => Promise<void>;
  clearData: () => void;
  isFromCache: boolean;
}

export function useCNPJLookup(): UseCNPJLookupReturn {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const clearData = useCallback(() => {
    setEmpresa(null);
    setSocios([]);
    setError(null);
    setIsFromCache(false);
  }, []);

  const lookupCNPJ = useCallback(async (cnpj: string) => {
    // Limpar dados anteriores
    clearData();

    // Validar CNPJ
    const cnpjClean = cnpj.replace(/\D/g, '');
    
    if (cnpjClean.length !== 14) {
      setError('CNPJ deve ter 14 dígitos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verificar cache local (localStorage) - Instantâneo
      const cacheKey = `cnpj_${cnpjClean}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const age = Date.now() - timestamp;
        const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 dias
        
        if (age < maxAge) {
          console.log('📦 Usando cache local (localStorage)');
          setEmpresa(data.empresa);
          setSocios(data.socios || []);
          setIsFromCache(true);
          setLoading(false);
          return;
        } else {
          // Cache expirado, remover
          localStorage.removeItem(cacheKey);
        }
      }

      // 2. Buscar na API (verifica Supabase + CNPJá se necessário)
      console.log('🔍 Buscando dados do CNPJ:', cnpjClean);
      
      const response = await fetch(`/api/cnpj-auto-complete?cnpj=${cnpjClean}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar dados da empresa');
      }

      const { empresa: empresaData, socios: sociosData, fromCache } = result;

      // Atualizar estado
      setEmpresa(empresaData);
      setSocios(sociosData || []);
      setIsFromCache(fromCache);

      // Salvar em cache local (localStorage)
      localStorage.setItem(cacheKey, JSON.stringify({
        data: { empresa: empresaData, socios: sociosData },
        timestamp: Date.now()
      }));

      console.log('✅ Dados carregados:', {
        razao_social: empresaData.razao_social,
        socios: sociosData?.length || 0,
        fromCache
      });

    } catch (err) {
      console.error('❌ Erro ao buscar CNPJ:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setEmpresa(null);
      setSocios([]);
    } finally {
      setLoading(false);
    }
  }, [clearData]);

  return {
    empresa,
    socios,
    loading,
    error,
    lookupCNPJ,
    clearData,
    isFromCache
  };
}

/**
 * Hook auxiliar para formatação de CNPJ em tempo real
 */
export function useCNPJFormatter() {
  const formatCNPJ = useCallback((value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  }, []);

  const isValidCNPJ = useCallback((cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.length === 14;
  }, []);

  return { formatCNPJ, isValidCNPJ };
}

/**
 * Hook combinado: formatação + busca automática
 * 
 * @example
 * const {
 *   cnpjValue,
 *   cnpjFormatted,
 *   handleCNPJChange,
 *   empresa,
 *   loading
 * } = useAutoCNPJLookup();
 * 
 * <input 
 *   value={cnpjFormatted} 
 *   onChange={handleCNPJChange}
 *   placeholder="00.000.000/0000-00"
 * />
 */
export function useAutoCNPJLookup() {
  const [cnpjValue, setCnpjValue] = useState('');
  const { formatCNPJ, isValidCNPJ } = useCNPJFormatter();
  const lookup = useCNPJLookup();

  const handleCNPJChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpjValue(formatted);

    // Auto-buscar quando CNPJ completo
    if (isValidCNPJ(formatted)) {
      const cleaned = formatted.replace(/\D/g, '');
      lookup.lookupCNPJ(cleaned);
    }
  }, [formatCNPJ, isValidCNPJ, lookup]);

  const cnpjFormatted = formatCNPJ(cnpjValue);

  return {
    cnpjValue,
    cnpjFormatted,
    handleCNPJChange,
    setCnpjValue,
    ...lookup
  };
}
