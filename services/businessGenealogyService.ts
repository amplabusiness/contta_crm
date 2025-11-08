import { GenealogyNode } from '../types.ts';
import { mockEmpresas } from '../data/mockData.ts';

// Helper to avoid infinite loops by tracking visited IDs (CNPJ or CPF)
const visited = new Set<string>();

const buildTreeRecursive = (
    currentId: string,
    currentType: 'empresa' | 'socio',
    currentLevel: number,
    maxDepth: number
): GenealogyNode[] => {
    if (currentLevel >= maxDepth) {
        return [];
    }

    visited.add(currentId);
    const children: GenealogyNode[] = [];

    if (currentType === 'empresa') {
        const empresa = mockEmpresas.find(e => e.cnpj === currentId);
        if (empresa) {
            for (const socio of empresa.quadro_socios) {
                if (!visited.has(socio.cpf_parcial)) {
                    children.push({
                        id: socio.cpf_parcial,
                        name: socio.nome_socio,
                        type: 'socio',
                        details: socio.qualificacao,
                        level: currentLevel + 1,
                        children: buildTreeRecursive(socio.cpf_parcial, 'socio', currentLevel + 1, maxDepth)
                    });
                }
            }
        }
    } else { // currentType is 'socio'
        const relatedEmpresas = mockEmpresas.filter(e =>
            // Find other companies this partner is part of, excluding the original one if we just came from it
            e.quadro_socios.some(s => s.cpf_parcial === currentId)
        );
        for (const empresa of relatedEmpresas) {
            if (!visited.has(empresa.cnpj)) {
                children.push({
                    id: empresa.cnpj,
                    name: empresa.nome_fantasia || empresa.razao_social,
                    type: 'empresa',
                    details: empresa.cnpj,
                    level: currentLevel + 1,
                    children: buildTreeRecursive(empresa.cnpj, 'empresa', currentLevel + 1, maxDepth)
                });
            }
        }
    }

    return children;
};

export const fetchBusinessGenealogy = async (startCnpj: string): Promise<GenealogyNode> => {
    // Simulate a heavier async workload for this complex analysis
    await new Promise(resolve => setTimeout(resolve, 2500)); 
    visited.clear();

    const startEmpresa = mockEmpresas.find(e => e.cnpj === startCnpj);
    if (!startEmpresa) {
        throw new Error("Empresa inicial não encontrada.");
    }

    // Max depth of 4 means 4 levels of children (root + 4 levels = 5 total levels).
    // Generation 1: Sócio -> Gen 2: Empresa -> Gen 3: Sócio -> Gen 4: Empresa
    const maxGenerations = 4;
    
    const rootNode: GenealogyNode = {
        id: startEmpresa.cnpj,
        name: startEmpresa.nome_fantasia || startEmpresa.razao_social,
        type: 'empresa',
        details: startEmpresa.cnpj,
        level: 0,
        children: buildTreeRecursive(startCnpj, 'empresa', 0, maxGenerations)
    };

    return rootNode;
};