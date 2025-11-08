

// FIX: Added file extension to import path.
import { Socio, RedeDeVinculos } from '../types.ts';

/**
 * Fetches the relationship network for a list of partners from the backend API.
 * NOTE: The backend will handle the complex logic and mock data generation for now.
 * The frontend is only responsible for calling the endpoint.
 */
export const fetchVinculos = async (socios: Socio[]): Promise<RedeDeVinculos[]> => {
  console.log(`Buscando vínculos para ${socios.length} sócios via API.`);
  
  // In a real application, you would pass socio identifiers to the backend
  const socioCpfs = socios.map(s => s.cpf_parcial);

  // This simulates a POST request to a backend endpoint that would do the heavy lifting
  try {
    // We are not creating a real backend, so we'll just return a pre-defined mock response
    // that would normally come from `POST /api/vinculos`
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Hardcoded mock response that simulates what the API would return
    const mockApiResponse: RedeDeVinculos[] = socios
      .map(socio => {
        // Simple hash to decide if a socio has links, for consistent results
        const hasLinks = socio.nome_socio.length % 3 !== 0; 
        if (!hasLinks) return null;

        return {
          socio_nome: socio.nome_socio,
          vinculos: [
            {
              empresa_vinculada_cnpj: '11.222.333/0001-44',
              empresa_vinculada_nome: 'Soluções Tech Ltda',
              grau_vinculo: 1,
              tipo_vinculo: 'direto',
            },
            {
              empresa_vinculada_cnpj: '44.555.666/0001-77',
              empresa_vinculada_nome: 'Agropecuária Campos Verdes',
              grau_vinculo: 2,
              tipo_vinculo: 'indireto_socio',
            }
          ]
        };
      })
      .filter((rede): rede is RedeDeVinculos => rede !== null);

    return mockApiResponse;
    
  } catch (error) {
    console.error("Erro ao buscar vínculos da API:", error);
    throw new Error('Falha ao comunicar com o serviço de análise de vínculos.');
  }
};