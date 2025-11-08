import { ContratoPublico, SancaoPublica } from '../types.ts';

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Simula um banco de dados de informações públicas
const mockPublicDatabase: { [cnpj: string]: { contratos: ContratoPublico[], sancoes: SancaoPublica[] } } = {
    "23.890.962/0001-28": { // CONSTRUCOES SEGURAS S.A.
        contratos: [
            {
                id: 'contrato-cs-01',
                orgao: 'Prefeitura Municipal de São Paulo',
                valor: 1250000.00,
                objeto: 'Construção de unidade básica de saúde na Zona Leste',
                data_assinatura: '2023-08-15',
                url: '#',
            },
            {
                id: 'contrato-cs-02',
                orgao: 'Governo do Estado de São Paulo',
                valor: 480000.50,
                objeto: 'Serviços de manutenção predial em escolas estaduais',
                data_assinatura: '2024-02-20',
                url: '#',
            }
        ],
        sancoes: []
    },
    "33.623.551/0001-93": { // TRANSPORTADORA VELOZ LTDA
        contratos: [],
        sancoes: [
            {
                id: 'sancao-tv-01',
                orgao: 'Agência Nacional de Transportes Terrestres (ANTT)',
                motivo: 'Inidoneidade declarada devido a irregularidades fiscais recorrentes.',
                data_publicacao: '2023-11-10',
                url: '#',
            }
        ]
    }
};

/**
 * Simula a busca de dados de fontes públicas para um determinado CNPJ.
 */
export const fetchPublicData = async (cnpj: string): Promise<{ contratos: ContratoPublico[], sancoes: SancaoPublica[] }> => {
    console.log(`Buscando dados públicos para o CNPJ: ${cnpj} (simulado)`);
    await simulateDelay(1200);

    const data = mockPublicDatabase[cnpj];

    if (data) {
        return data;
    }

    // Retorna vazio para empresas sem dados no mock
    return {
        contratos: [],
        sancoes: [],
    };
};