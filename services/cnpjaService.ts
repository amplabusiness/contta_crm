

// FIX: Added file extension to import path.
import { Empresa } from '../types.ts';
import { mockEmpresas } from '../data/mockData.ts';

type ProgressCallback = (processed: number, total: number) => void;

/**
 * Busca dados de uma lista de CNPJs de forma simulada usando dados locais.
 * Isso substitui a chamada à API externa que estava falhando no ambiente.
 */
export const fetchEmpresasData = async (cnpjs: string[], onProgress: ProgressCallback): Promise<Empresa[]> => {
  console.log(`Iniciando busca de dados para ${cnpjs.length} CNPJs (simulado com dados locais).`);
  const empresas: Empresa[] = [];

  for (let i = 0; i < cnpjs.length; i++) {
    const cnpj = cnpjs[i];
    const sanitizedCnpj = cnpj.replace(/[^\d]/g, '');
    
    // Procura a empresa nos dados mockados
    const found = mockEmpresas.find(e => e.cnpj.replace(/[^\d]/g, '') === sanitizedCnpj);
    if (found) {
      empresas.push(found);
    } else {
      console.warn(`CNPJ ${cnpj} não encontrado nos dados simulados.`);
    }
    
    // Simula o progresso e um pequeno delay
    onProgress(i + 1, cnpjs.length);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`Busca simulada finalizada. ${empresas.length} empresas encontradas.`);
  return empresas;
};