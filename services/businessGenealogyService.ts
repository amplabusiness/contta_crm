/**
 * services/businessGenealogyService.ts
 * 
 * Mapeamento de rede de sócios até 4º grau usando API CNPJá REAL
 * 
 * Algoritmo:
 * - 1º Grau: Empresa raiz + seus sócios
 * - 2º Grau: Outras empresas dos sócios de 1º grau
 * - 3º Grau: Sócios das empresas de 2º grau
 * - 4º Grau: Empresas dos sócios de 3º grau
 * 
 * @see PLANO_PRODUCAO.md - Seção 5.3
 */

import type { GenealogyNode } from '../types.ts';
import * as cnpjaService from './cnpjaService.ts';

// Limites para evitar explosão combinatória
const MAX_SOCIOS_PER_COMPANY = 10; // Máximo de sócios por empresa a explorar
const MAX_COMPANIES_PER_SOCIO = 5;  // Máximo de empresas por sócio a explorar
const MAX_TOTAL_NODES = 100;        // Máximo de nós no grafo

// Controle de nós visitados para evitar ciclos
const visited = new Set<string>();
let totalNodes = 0;

/**
 * Constrói árvore genealógica recursiva até maxDepth
 */
const buildTreeRecursive = async (
    currentId: string,
    currentType: 'empresa' | 'socio',
    currentLevel: number,
    maxDepth: number
): Promise<GenealogyNode[]> => {
    // Condições de parada
    if (currentLevel >= maxDepth) return [];
    if (visited.has(currentId)) return [];
    if (totalNodes >= MAX_TOTAL_NODES) {
        console.warn(`⚠️ Limite de ${MAX_TOTAL_NODES} nós atingido`);
        return [];
    }

    visited.add(currentId);
    totalNodes++;
    
    const children: GenealogyNode[] = [];

    try {
        if (currentType === 'empresa') {
            // ============================================================
            // EMPRESA → Buscar SÓCIOS (próximo nível)
            // ============================================================
            console.log(`📊 [Nível ${currentLevel}] Buscando sócios de empresa ${currentId.substring(0, 14)}...`);
            
            const empresa = await cnpjaService.getCompanyDetails(currentId);
            if (!empresa) {
                console.warn(`❌ Empresa ${currentId} não encontrada`);
                return [];
            }

            const socios = empresa.quadro_socios.slice(0, MAX_SOCIOS_PER_COMPANY);
            console.log(`✅ Encontrados ${socios.length} sócios para empresa ${currentId.substring(0, 14)}`);

            for (const socio of socios) {
                if (!visited.has(socio.cpf_parcial) && totalNodes < MAX_TOTAL_NODES) {
                    const socioNode: GenealogyNode = {
                        id: socio.cpf_parcial,
                        name: socio.nome_socio,
                        type: 'socio',
                        details: `${socio.qualificacao} - ${socio.percentual_capital}% capital`,
                        level: currentLevel + 1,
                        children: await buildTreeRecursive(
                            socio.cpf_parcial,
                            'socio',
                            currentLevel + 1,
                            maxDepth
                        )
                    };
                    children.push(socioNode);
                }
            }

        } else {
            // ============================================================
            // SÓCIO → Buscar EMPRESAS (próximo nível)
            // ============================================================
            console.log(`👤 [Nível ${currentLevel}] Buscando empresas de sócio ${currentId.substring(0, 11)}...`);
            
            const empresas = await cnpjaService.findCompaniesBySocio(currentId);
            const limitedEmpresas = empresas.slice(0, MAX_COMPANIES_PER_SOCIO);
            
            console.log(`✅ Encontradas ${limitedEmpresas.length} empresas para sócio ${currentId.substring(0, 11)}`);

            for (const empresa of limitedEmpresas) {
                if (!visited.has(empresa.cnpj) && totalNodes < MAX_TOTAL_NODES) {
                    const empresaNode: GenealogyNode = {
                        id: empresa.cnpj,
                        name: empresa.nome_fantasia || empresa.razao_social,
                        type: 'empresa',
                        details: `${empresa.cnpj} - ${empresa.situacao_cadastral}`,
                        level: currentLevel + 1,
                        children: await buildTreeRecursive(
                            empresa.cnpj,
                            'empresa',
                            currentLevel + 1,
                            maxDepth
                        )
                    };
                    children.push(empresaNode);
                }
            }
        }

    } catch (error) {
        console.error(`❌ Erro ao processar ${currentType} ${currentId}:`, error);
        // Continuar mesmo com erro (não quebrar toda a árvore)
    }

    return children;
};

/**
 * Gera genealogia de negócios até 4º grau a partir de um CNPJ raiz
 * 
 * @param startCnpj - CNPJ da empresa raiz
 * @returns Árvore completa de relacionamentos
 */
export async function fetchBusinessGenealogy(startCnpj: string): Promise<GenealogyNode> {
    console.log(`🚀 Iniciando mapeamento de rede para CNPJ ${startCnpj}...`);
    
    // Reset controles
    visited.clear();
    totalNodes = 0;

    const sanitizedCNPJ = startCnpj.replace(/\D/g, '');

    // Buscar empresa raiz
    const startEmpresa = await cnpjaService.getCompanyDetails(sanitizedCNPJ);
    if (!startEmpresa) {
        throw new Error(`Empresa inicial ${startCnpj} não encontrada na API CNPJá`);
    }

    console.log(`✅ Empresa raiz encontrada: ${startEmpresa.razao_social}`);

    // Construir árvore recursiva até 4º grau
    // Nível 0: Empresa raiz
    // Nível 1: Sócios da empresa raiz
    // Nível 2: Empresas dos sócios
    // Nível 3: Sócios das empresas de 2º grau
    // Nível 4: Empresas dos sócios de 3º grau
    const maxGenerations = 4;

    const rootNode: GenealogyNode = {
        id: startEmpresa.cnpj,
        name: startEmpresa.nome_fantasia || startEmpresa.razao_social,
        type: 'empresa',
        details: `${startEmpresa.cnpj} - ${startEmpresa.cnae_principal.descricao}`,
        level: 0,
        children: await buildTreeRecursive(sanitizedCNPJ, 'empresa', 0, maxGenerations)
    };

    console.log(`✅ Mapeamento concluído: ${totalNodes} nós mapeados até ${maxGenerations}º grau`);

    return rootNode;
}

/**
 * Identifica parentes prováveis (mesmo sobrenome + empresas em comum)
 * COMPLEMENTAR ao mapeamento de sócios
 */
export async function identifyPotentialRelatives(nodes: GenealogyNode[]): Promise<Array<{
    person1: string;
    person2: string;
    confidence: number;
    reason: string;
}>> {
    const people = nodes.filter(n => n.type === 'socio');
    const relatives: Array<{ person1: string; person2: string; confidence: number; reason: string }> = [];

    for (let i = 0; i < people.length; i++) {
        for (let j = i + 1; j < people.length; j++) {
            const p1 = people[i];
            const p2 = people[j];

            // Extrair sobrenome (última palavra do nome)
            const lastName1 = p1.name.split(' ').pop();
            const lastName2 = p2.name.split(' ').pop();

            if (lastName1 === lastName2 && lastName1) {
                // Contar empresas em comum (mesmos children CNPJ)
                const p1Companies = p1.children.filter(c => c.type === 'empresa').map(c => c.id);
                const p2Companies = p2.children.filter(c => c.type === 'empresa').map(c => c.id);
                const commonCompanies = p1Companies.filter(c => p2Companies.includes(c));

                if (commonCompanies.length > 0) {
                    relatives.push({
                        person1: p1.id,
                        person2: p2.id,
                        confidence: Math.min(0.7 + (commonCompanies.length * 0.1), 1.0),
                        reason: `Mesmo sobrenome "${lastName1}" + ${commonCompanies.length} empresa(s) em comum`
                    });
                }
            }
        }
    }

    return relatives;
}