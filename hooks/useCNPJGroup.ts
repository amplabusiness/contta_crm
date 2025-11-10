import { useState, useCallback } from 'react';

/**
 * Utilitários para trabalhar com CNPJ
 */
export const CNPJUtils = {
  /**
   * Extrai o CNPJ raiz (8 primeiros dígitos)
   * @param cnpj CNPJ com 14 dígitos
   * @returns CNPJ raiz (8 dígitos)
   */
  getCNPJRaiz: (cnpj: string): string => {
    const clean = cnpj.replace(/\D/g, '');
    return clean.substring(0, 8);
  },

  /**
   * Extrai a ordem (4 dígitos após o CNPJ raiz)
   * @param cnpj CNPJ com 14 dígitos
   * @returns Ordem (0001, 0002, etc.)
   */
  getOrdem: (cnpj: string): string => {
    const clean = cnpj.replace(/\D/g, '');
    return clean.substring(8, 12);
  },

  /**
   * Verifica se é matriz (ordem = 0001)
   * @param cnpj CNPJ com 14 dígitos
   * @returns true se for matriz
   */
  isMatriz: (cnpj: string): boolean => {
    return CNPJUtils.getOrdem(cnpj) === '0001';
  },

  /**
   * Verifica se é filial (ordem != 0001)
   * @param cnpj CNPJ com 14 dígitos
   * @returns true se for filial
   */
  isFilial: (cnpj: string): boolean => {
    return !CNPJUtils.isMatriz(cnpj);
  },

  /**
   * Formata CNPJ raiz
   * @param cnpjRaiz 8 dígitos
   * @returns Formatado: 00.000.000
   */
  formatCNPJRaiz: (cnpjRaiz: string): string => {
    const clean = cnpjRaiz.replace(/\D/g, '');
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}`;
  },

  /**
   * Gera badge de tipo (Matriz/Filial)
   * @param cnpj CNPJ com 14 dígitos
   * @returns { type: 'matriz' | 'filial', label: string, ordem: string }
   */
  getTipoBadge: (cnpj: string) => {
    const ordem = CNPJUtils.getOrdem(cnpj);
    const isMatriz = ordem === '0001';
    
    return {
      type: isMatriz ? 'matriz' : 'filial',
      label: isMatriz ? 'Matriz' : `Filial ${parseInt(ordem) - 1}`,
      ordem
    };
  }
};

/**
 * Interface para empresa do grupo
 */
interface EmpresaGrupo {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  ordem?: string;
  situacao_cadastral?: string;
  endereco?: any;
  telefone?: string;
  email?: string;
}

interface GrupoEmpresarial {
  cnpjRaiz: string;
  cnpjFornecido: string;
  isMatriz: boolean;
  matriz: EmpresaGrupo | null;
  filiais: EmpresaGrupo[];
  totalEmpresas: number;
  totalFiliais: number;
  fromCache: boolean;
}

interface UseCNPJGroupReturn {
  grupo: GrupoEmpresarial | null;
  loading: boolean;
  error: string | null;
  findGroup: (cnpj: string) => Promise<void>;
  clearData: () => void;
}

/**
 * Hook para buscar matriz e filiais de um CNPJ
 * 
 * Quando o usuário digita um CNPJ (matriz ou filial),
 * o sistema automaticamente busca TODAS as empresas do grupo.
 * 
 * Estrutura do CNPJ:
 * - 8 primeiros dígitos: CNPJ Raiz (identifica o grupo)
 * - 4 dígitos seguintes: Ordem (0001=Matriz, 0002+=Filiais)
 * - 2 últimos dígitos: Verificadores
 * 
 * @example
 * const { grupo, loading, findGroup } = useCNPJGroup();
 * 
 * // Buscar grupo (pode ser CNPJ de matriz ou filial)
 * findGroup('12345678000190');
 * 
 * // Acessar dados
 * if (grupo) {
 *   console.log('Matriz:', grupo.matriz);
 *   console.log('Filiais:', grupo.filiais);
 *   console.log('Total:', grupo.totalEmpresas);
 * }
 */
export function useCNPJGroup(): UseCNPJGroupReturn {
  const [grupo, setGrupo] = useState<GrupoEmpresarial | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearData = useCallback(() => {
    setGrupo(null);
    setError(null);
  }, []);

  const findGroup = useCallback(async (cnpj: string) => {
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
      console.log('🔍 Buscando grupo empresarial para CNPJ:', cnpjClean);

      const response = await fetch(`/api/cnpj-find-group?cnpj=${cnpjClean}`, {
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
        throw new Error(result.error || 'Erro ao buscar grupo empresarial');
      }

      // Atualizar estado
      setGrupo({
        cnpjRaiz: result.cnpjRaiz,
        cnpjFornecido: result.cnpjFornecido,
        isMatriz: result.isMatriz,
        matriz: result.matriz,
        filiais: result.filiais || [],
        totalEmpresas: result.totalEmpresas,
        totalFiliais: result.totalFiliais,
        fromCache: result.fromCache
      });

      console.log('✅ Grupo encontrado:', {
        raiz: result.cnpjRaiz,
        total: result.totalEmpresas,
        matriz: result.matriz?.razao_social,
        filiais: result.totalFiliais
      });

    } catch (err) {
      console.error('❌ Erro ao buscar grupo:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setGrupo(null);
    } finally {
      setLoading(false);
    }
  }, [clearData]);

  return {
    grupo,
    loading,
    error,
    findGroup,
    clearData
  };
}

/**
 * Hook auxiliar para exibir badge de tipo (Matriz/Filial)
 * 
 * @example
 * const badge = useCNPJBadge('12345678000190');
 * // { type: 'matriz', label: 'Matriz', ordem: '0001' }
 * 
 * const badge2 = useCNPJBadge('12345678000271');
 * // { type: 'filial', label: 'Filial 1', ordem: '0002' }
 */
export function useCNPJBadge(cnpj: string) {
  if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
    return null;
  }

  return CNPJUtils.getTipoBadge(cnpj);
}
