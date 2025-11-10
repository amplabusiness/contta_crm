import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase não configurado: defina SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface NetworkNode {
  id: string;
  type: 'company' | 'person';
  label: string;
  degree: number;
  data: any;
}

interface NetworkEdge {
  from: string;
  to: string;
  relationship: 'socio' | 'parente' | 'mesmo_endereco';
  strength: number;
}

/**
 * API Endpoint: Buscar Rede Genealógica
 * 
 * GET /api/genealogy?cnpj={14digitos}&degree={1-4}
 * 
 * Retorna grafo de relacionamentos até N graus:
 * - 1º Grau: Empresa raiz + sócios diretos
 * - 2º Grau: Outras empresas dos sócios
 * - 3º Grau: Sócios das empresas de 2º grau
 * - 4º Grau: Empresas dos sócios de 3º grau
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cnpj, degree = '3' } = req.query;

    // Validações
    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({ error: 'CNPJ é obrigatório' });
    }

    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) {
      return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos' });
    }

    const maxDegree = Math.min(Math.max(parseInt(degree as string) || 3, 1), 4);

    console.log(`🌳 Buscando rede genealógica: CNPJ=${cnpjClean}, Grau=${maxDegree}`);

    // Construir rede
    const network = await buildNetworkGraph(cnpjClean, maxDegree);

    // Estatísticas
    const stats = {
      totalNodes: network.nodes.length,
      empresas: network.nodes.filter(n => n.type === 'company').length,
      socios: network.nodes.filter(n => n.type === 'person').length,
      relacoes: network.edges.length,
      maxDegree,
    };

    console.log(`✅ Rede construída:`, stats);

    return res.status(200).json({
      success: true,
      cnpj: cnpjClean,
      nodes: network.nodes,
      edges: network.edges,
      stats,
      metadata: {
        timestamp: new Date().toISOString(),
        cached: network.cached || false,
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar rede genealógica:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar rede genealógica',
      details: error.message,
    });
  }
}

/**
 * Constrói grafo de relacionamentos até N graus
 */
async function buildNetworkGraph(
  rootCnpj: string,
  maxDegree: number
): Promise<{
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  cached: boolean;
}> {
  const visited = new Set<string>();
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  let cached = false;

  const companyCache = new Map<string, Awaited<ReturnType<typeof getCompanyData>>>();
  const socioCache = new Map<string, Awaited<ReturnType<typeof getSocioData>>>();
  const socioCompaniesCache = new Map<string, Awaited<ReturnType<typeof getCompaniesBySocio>>>();

  // Queue para processar BFS (largura)
  const queue: Array<{ id: string; type: 'company' | 'person'; degree: number }> = [
    { id: rootCnpj, type: 'company', degree: 1 }
  ];

  while (queue.length > 0 && queue[0].degree <= maxDegree) {
    const current = queue.shift()!;

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    if (current.type === 'company') {
      // Processar empresa
      const empresa = await (async () => {
        if (companyCache.has(current.id)) return companyCache.get(current.id)!;
        const data = await getCompanyData(current.id);
        companyCache.set(current.id, data);
        return data;
      })();
      
      if (!empresa) {
        console.warn(`⚠️  Empresa ${current.id} não encontrada`);
        continue;
      }

      nodes.push({
        id: current.id,
        type: 'company',
        label: empresa.razao_social,
        degree: current.degree,
        data: {
          cnpj: empresa.cnpj,
          nome_fantasia: empresa.nome_fantasia,
          situacao_cadastral: empresa.situacao_cadastral,
          porte: empresa.porte,
          endereco: empresa.endereco,
        }
      });

      // Adicionar sócios à queue (próximo grau)
      if (empresa.socios && current.degree < maxDegree) {
        for (const socio of empresa.socios) {
          const socioId = socio.cpf_cnpj || socio.id;
          
          if (!visited.has(socioId)) {
            queue.push({
              id: socioId,
              type: 'person',
              degree: current.degree + 1
            });

            // Criar edge: sócio → empresa
            edges.push({
              from: socioId,
              to: current.id,
              relationship: 'socio',
              strength: socio.participacao != null ? socio.participacao / 100 : 0
            });
          }
        }
      }

    } else {
      // Processar sócio/pessoa
      const socio = await (async () => {
        if (socioCache.has(current.id)) return socioCache.get(current.id)!;
        const data = await getSocioData(current.id);
        socioCache.set(current.id, data);
        return data;
      })();
      
      if (!socio) {
        console.warn(`⚠️  Sócio ${current.id} não encontrado`);
        continue;
      }

      nodes.push({
        id: current.id,
        type: 'person',
        label: socio.nome,
        degree: current.degree,
        data: {
          cpf_cnpj: socio.cpf_cnpj,
          qualificacao: socio.qualificacao,
          participacao: socio.participacao,
        }
      });

      // Buscar outras empresas deste sócio (próximo grau)
      if (current.degree < maxDegree) {
        const empresas = await (async () => {
          if (socioCompaniesCache.has(current.id)) {
            return socioCompaniesCache.get(current.id)!;
          }
          const data = await getCompaniesBySocio(current.id);
          socioCompaniesCache.set(current.id, data);
          return data;
        })();
        
        for (const empresa of empresas) {
          if (!visited.has(empresa.cnpj)) {
            queue.push({
              id: empresa.cnpj,
              type: 'company',
              degree: current.degree + 1
            });

            // Edge já criado quando empresa foi processada
          }
        }
      }
    }
  }

  // Identificar parentes (mesmo sobrenome + empresas em comum)
  identifyRelatives(nodes, edges);

  return { nodes, edges, cached };
}

/**
 * Busca dados de uma empresa no Supabase
 */
async function getCompanyData(cnpj: string) {
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select(
        'cnpj, razao_social, nome_fantasia, situacao_cadastral, porte, logradouro, numero, bairro, cidade, uf'
      )
      .eq('cnpj', cnpj)
      .maybeSingle();

    if (error) {
      console.error(`Erro ao buscar empresa ${cnpj}:`, error);
      return null;
    }

    if (!data) {
      return null;
    }

    const { data: relacoes, error: relacoesError } = await supabase
      .from('empresa_socios')
      .select('socio_cpf_parcial, qualificacao, percentual_capital')
      .eq('empresa_cnpj', cnpj);

    if (relacoesError) {
      console.error(`Erro ao buscar sócios da empresa ${cnpj}:`, relacoesError);
      return {
        ...data,
        socios: [],
        endereco: buildEndereco(data),
      };
    }

    const socioCpfs = relacoes?.map((rel) => rel.socio_cpf_parcial).filter(Boolean) || [];

    let sociosDetalhes: Array<{ cpf_parcial: string; nome_socio: string }>
      = [];

    if (socioCpfs.length > 0) {
      const { data: sociosData, error: sociosError } = await supabase
        .from('socios')
        .select('cpf_parcial, nome_socio')
        .in('cpf_parcial', socioCpfs);

      if (sociosError) {
        console.error(`Erro ao buscar dados dos sócios (${cnpj}):`, sociosError);
      } else {
        sociosDetalhes = sociosData || [];
      }
    }

    const socios = (relacoes || []).map((rel) => {
      const socioInfo = sociosDetalhes.find((s) => s.cpf_parcial === rel.socio_cpf_parcial);
      return {
        id: rel.socio_cpf_parcial,
        nome: socioInfo?.nome_socio || 'Sócio não identificado',
        cpf_cnpj: rel.socio_cpf_parcial,
        qualificacao: rel.qualificacao,
        participacao: rel.percentual_capital != null ? Number(rel.percentual_capital) : null,
      };
    });

    return {
      ...data,
      socios,
      endereco: buildEndereco(data),
    };

  } catch (err) {
    console.error('Erro ao buscar empresa:', err);
    return null;
  }
}

/**
 * Busca dados de um sócio no Supabase
 */
async function getSocioData(cpfOrId: string) {
  try {
    const { data: socio, error } = await supabase
      .from('socios')
      .select('cpf_parcial, nome_socio')
      .eq('cpf_parcial', cpfOrId)
      .maybeSingle();

    if (error) {
      console.error(`Erro ao buscar sócio ${cpfOrId}:`, error);
      return null;
    }

    if (!socio) {
      return null;
    }

    const { data: relacionamento, error: relError } = await supabase
      .from('empresa_socios')
      .select('qualificacao, percentual_capital')
      .eq('socio_cpf_parcial', cpfOrId)
      .limit(1)
      .maybeSingle();

    if (relError) {
      console.error(`Erro ao buscar relação do sócio ${cpfOrId}:`, relError);
    }

    return {
      id: socio.cpf_parcial,
      nome: socio.nome_socio,
      cpf_cnpj: socio.cpf_parcial,
      qualificacao: relacionamento?.qualificacao,
      participacao: relacionamento?.percentual_capital != null ? Number(relacionamento.percentual_capital) : null,
    };

  } catch (err) {
    console.error('Erro ao buscar sócio:', err);
    return null;
  }
}

/**
 * Busca empresas que têm determinado sócio
 */
async function getCompaniesBySocio(socioId: string) {
  try {
    const { data: relacoes, error } = await supabase
      .from('empresa_socios')
      .select('empresa_cnpj')
      .eq('socio_cpf_parcial', socioId)
      .limit(10); // Limitar para evitar explosão de nodes

    if (error) {
      console.error(`Erro ao buscar empresas do sócio ${socioId}:`, error);
      return [];
    }

    const cnpjs = (relacoes || []).map((rel) => rel.empresa_cnpj).filter(Boolean);

    if (cnpjs.length === 0) {
      return [];
    }

    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('cnpj, razao_social, nome_fantasia, situacao_cadastral, cidade, uf, porte')
      .in('cnpj', cnpjs);

    if (empresasError) {
      console.error(`Erro ao buscar dados das empresas do sócio ${socioId}:`, empresasError);
      return [];
    }

    return empresas || [];

  } catch (err) {
    console.error('Erro ao buscar empresas por sócio:', err);
    return [];
  }
}

function buildEndereco(data: any) {
  return {
    logradouro: data.logradouro,
    numero: data.numero,
    bairro: data.bairro,
    cidade: data.cidade,
    uf: data.uf,
  };
}

/**
 * Identifica possíveis parentes (mesmo sobrenome + empresas em comum)
 */
function identifyRelatives(nodes: NetworkNode[], edges: NetworkEdge[]) {
  const people = nodes.filter(n => n.type === 'person');

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const p1 = people[i];
      const p2 = people[j];

      // Extrair sobrenomes
      const lastName1 = p1.label.split(' ').pop()?.toLowerCase();
      const lastName2 = p2.label.split(' ').pop()?.toLowerCase();

      // Mesmo sobrenome
      if (lastName1 && lastName2 && lastName1 === lastName2) {
        // Verificar se têm empresas em comum
        const p1Companies = edges
          .filter(e => e.from === p1.id && e.relationship === 'socio')
          .map(e => e.to);
        
        const p2Companies = edges
          .filter(e => e.from === p2.id && e.relationship === 'socio')
          .map(e => e.to);

        const commonCompanies = p1Companies.filter(c => p2Companies.includes(c));

        if (commonCompanies.length > 0) {
          // Adicionar edge de parentesco
          edges.push({
            from: p1.id,
            to: p2.id,
            relationship: 'parente',
            strength: 0.7 // Probabilidade de parentesco
          });

          console.log(`👨‍👩‍👧‍👦 Possível parentesco: ${p1.label} ↔ ${p2.label}`);
        }
      }
    }
  }
}
