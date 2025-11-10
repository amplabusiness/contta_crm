

// FIX: Added file extension to import path.
import { Socio, GenealogiaSocio, ParentePotencial } from '../types.ts';

const cache = new Map<string, GenealogiaSocio>();

/**
 * Busca possíveis parentes de um sócio consultando o backend (dados reais do Supabase).
 */
export const fetchGenealogia = async (socio: Socio): Promise<GenealogiaSocio> => {
    if (cache.has(socio.cpf_parcial)) {
        return cache.get(socio.cpf_parcial)!;
    }

    try {
        const response = await fetch(`/api/genealogy-relatives?cpf=${encodeURIComponent(socio.cpf_parcial)}`);

        if (!response.ok) {
            const errorBody = await safeParseJson(response);
            throw new Error(errorBody?.error || 'Falha ao carregar parentes do sócio.');
        }

        const data = await response.json();

        const resultado: GenealogiaSocio = {
            socio_principal_cpf: socio.cpf_parcial,
            parentes: (data?.parentes as ParentePotencial[] | undefined) ?? [],
        };

        cache.set(socio.cpf_parcial, resultado);

        return resultado;
    } catch (error) {
        console.error('Erro ao buscar genealogia do sócio:', error);
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