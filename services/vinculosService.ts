

// FIX: Added file extension to import path.
import { Socio, RedeDeVinculos } from '../types.ts';

interface FetchVinculosOptions {
  empresaCnpj?: string;
}

/**
 * Busca vínculos reais dos sócios consultando o backend.
 */
export const fetchVinculos = async (
  socios: Socio[],
  options: FetchVinculosOptions = {}
): Promise<RedeDeVinculos[]> => {
  if (socios.length === 0) return [];

  try {
    const response = await fetch('/api/vinculos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        socios: socios.map((s) => ({
          cpf_parcial: s.cpf_parcial,
          nome: s.nome_socio,
        })),
        empresaCnpj: options.empresaCnpj,
      }),
    });

    if (!response.ok) {
      const errorBody = await safeParseJson(response);
      throw new Error(errorBody?.error || 'Falha ao carregar vínculos.');
    }

    const data = await response.json();
    const redes: RedeDeVinculos[] = data?.redes || [];

    return redes.map((rede) => ({
      socio_nome: rede.socio_nome,
      vinculos: Array.isArray(rede.vinculos) ? rede.vinculos : [],
    }));
  } catch (error) {
    console.error('Erro ao buscar vínculos da API:', error);
    throw error;
  }
};

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}