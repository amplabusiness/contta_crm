

// FIX: Added file extension to import path.
import { Socio, GenealogiaSocio, ParentePotencial } from '../types.ts';

const mockNomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira'];

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateParente = (sobrenome: string): ParentePotencial => {
    const nome = `Maria ${sobrenome}`;
    const tipoDescobertaOptions = [
        `Mesmo sobrenome (${sobrenome})`,
        'Mesmo endereço residencial',
        'CPF com região e sequência próxima',
        'Sócio na mesma empresa de 2º grau',
    ];

    return {
        cpf_parcial_relacionado: `***.123.${Math.floor(Math.random() * 900) + 100}-**`,
        nome_relacionado: nome,
        tipo_descoberta: getRandomItem(tipoDescobertaOptions),
        confiabilidade: Math.floor(Math.random() * 50) + 45, // 45% to 95%
    };
};

/**
 * Simulates fetching the genealogy for a specific partner.
 * In a real application, this would call a backend endpoint that runs complex analysis.
 */
export const fetchGenealogia = async (socio: Socio): Promise<GenealogiaSocio> => {
    console.log(`Simulando análise de genealogia para ${socio.nome_socio}...`);

    return new Promise(resolve => {
        setTimeout(() => {
            const sobrenome = socio.nome_socio.split(' ').pop() || getRandomItem(mockNomes);
            const numParentes = Math.floor(Math.random() * 3); // 0 to 2 potential relatives
            const parentes: ParentePotencial[] = [];

            for (let i = 0; i < numParentes; i++) {
                parentes.push(generateParente(sobrenome));
            }

            const resultado: GenealogiaSocio = {
                socio_principal_cpf: socio.cpf_parcial,
                parentes: parentes,
            };

            resolve(resultado);
        }, 1000 + Math.random() * 800); // Simulate network and analysis latency
    });
};