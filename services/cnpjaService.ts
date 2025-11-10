/**
 * services/cnpjaService.ts
 * 
 * Integração com API CNPJá (https://api.cnpja.com)
 * 
 * Funcionalidades:
 * - Busca de empresa por CNPJ
 * - Busca de empresas por sócio (CPF/CNPJ)
 * - Busca avançada por filtros (CNAE, UF, situação, porte)
 * - Cache inteligente (Supabase) para economizar chamadas
 * - Mapeamento de rede de sócios até 4º grau
 * 
 * @see PLANO_PRODUCAO.md - Seção 5
 */

import type { Empresa, Socio, Endereco, CNAE } from '../types.ts';
import { supabase } from './supabaseClient.ts';

type ProgressCallback = (processed: number, total: number) => void;

// ============================================================================
// CONSTANTES
// ============================================================================

const CNPJA_API_BASE = 'https://api.cnpja.com';
const CNPJA_API_KEY = import.meta.env.VITE_CNPJA_API_KEY || process.env.CNPJA_API_KEY;
const CACHE_DURATION_DAYS = 30; // Dados válidos por 30 dias

// ============================================================================
// TIPOS DA API CNPJá
// ============================================================================

interface CNPJaCompanyResponse {
  tax_id: string;
  name: string;
  alias?: string;
  founded?: string;
  size?: string;
  legal_nature?: string;
  main_activity: {
    code: string;
    description: string;
  };
  sideActivities?: Array<{
    code: string;
    description: string;
  }>;
  address: {
    street: string;
    number: string;
    details?: string;
    district: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  phones?: string[];
  emails?: string[];
  status: {
    id: number;
    text: string;
  };
  members?: Array<{
    person: {
      name: string;
      tax_id: string;
      type: 'NATURAL' | 'JURIDICA';
    };
    role: {
      id: number;
      text: string;
    };
    equity_share?: number;
    since?: string;
  }>;
}

interface CNPJaSearchFilters {
  cnae?: string;
  uf?: string;
  cidade?: string;
  situacao?: 'ATIVA' | 'BAIXADA' | 'SUSPENSA';
  porte?: 'ME' | 'EPP' | 'DEMAIS';
  createdAfter?: Date;
  page?: number;
  limit?: number;
}

// ============================================================================
// FUNÇÕES DE CACHE
// ============================================================================

/**
 * Verifica se timestamp está dentro do período de cache (30 dias)
 */
function isRecent(timestamp: string | null, days: number = CACHE_DURATION_DAYS): boolean {
  if (!timestamp) return false;
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < days;
}

/**
 * Busca empresa no cache do Supabase
 */
async function getFromCache(cnpj: string): Promise<Empresa | null> {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('cnpj', cnpj)
    .single();

  if (error || !data) return null;

  // Verificar se dados estão atualizados
  if (!isRecent(data.created_at)) {
    console.log(`Cache expirado para CNPJ ${cnpj} (> ${CACHE_DURATION_DAYS} dias)`);
    return null;
  }

  // Converter do formato DB para Empresa
  return mapDBToEmpresa(data);
}

/**
 * Salva empresa no cache do Supabase
 */
async function saveToCache(empresa: Empresa): Promise<void> {
  const dbEmpresa = mapEmpresaToDB(empresa);
  
  const { error } = await supabase
    .from('empresas')
    .upsert(dbEmpresa, { onConflict: 'cnpj' });

  if (error) {
    console.error(`Erro ao salvar empresa ${empresa.cnpj} no cache:`, error);
  }
}

// ============================================================================
// FUNÇÕES DE MAPEAMENTO CNPJá → Empresa
// ============================================================================

/**
 * Mapeia resposta da API CNPJá para interface Empresa
 */
function mapCNPJaToEmpresa(data: CNPJaCompanyResponse): Empresa {
  return {
    cnpj: data.tax_id,
    razao_social: data.name,
    nome_fantasia: data.alias || data.name,
    situacao_cadastral: normalizeSituacao(data.status.text),
    data_abertura: data.founded || '',
    porte: normalizePorte(data.size),
    
    endereco_principal: {
      logradouro: data.address.street,
      numero: data.address.number,
      bairro: data.address.district,
      cidade: data.address.city,
      uf: data.address.state,
      cep: data.address.zip,
    },
    
    cnae_principal: {
      codigo: data.main_activity.code,
      descricao: data.main_activity.description,
    },
    
    quadro_socios: (data.members || []).map(m => ({
      nome_socio: m.person.name,
      cpf_parcial: m.person.tax_id,
      qualificacao: m.role.text,
      percentual_capital: m.equity_share || 0,
    })),
    
    telefones: data.phones || [],
    emails: data.emails || [],
    documentos: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Mapeia formato DB para Empresa (com objetos aninhados)
 */
function mapDBToEmpresa(db: any): Empresa {
  return {
    cnpj: db.cnpj,
    razao_social: db.razao_social,
    nome_fantasia: db.nome_fantasia || '',
    situacao_cadastral: db.situacao_cadastral || 'Ativa',
    data_abertura: db.data_abertura || '',
    porte: db.porte || 'Demais',
    
    endereco_principal: {
      logradouro: db.logradouro || '',
      numero: db.numero || '',
      bairro: db.bairro || '',
      cidade: db.cidade || '',
      uf: db.uf || '',
      cep: db.cep || '',
      latitude: db.latitude,
      longitude: db.longitude,
    },
    
    cnae_principal: {
      codigo: db.cnae_principal_codigo || '',
      descricao: db.cnae_principal_descricao || '',
    },
    
    quadro_socios: [], // Buscar em tabela separada
    telefones: db.telefones || [],
    emails: db.emails || [],
    documentos: [],
    createdAt: db.created_at,
  };
}

/**
 * Mapeia Empresa para formato DB (campos individuais)
 */
function mapEmpresaToDB(empresa: Empresa): any {
  return {
    cnpj: empresa.cnpj,
    razao_social: empresa.razao_social,
    nome_fantasia: empresa.nome_fantasia,
    situacao_cadastral: empresa.situacao_cadastral,
    data_abertura: empresa.data_abertura,
    porte: empresa.porte,
    
    logradouro: empresa.endereco_principal.logradouro,
    numero: empresa.endereco_principal.numero,
    bairro: empresa.endereco_principal.bairro,
    cidade: empresa.endereco_principal.cidade,
    uf: empresa.endereco_principal.uf,
    cep: empresa.endereco_principal.cep,
    latitude: empresa.endereco_principal.latitude,
    longitude: empresa.endereco_principal.longitude,
    
    cnae_principal_codigo: empresa.cnae_principal.codigo,
    cnae_principal_descricao: empresa.cnae_principal.descricao,
    
    telefones: empresa.telefones,
    emails: empresa.emails,
    created_at: empresa.createdAt || new Date().toISOString(),
  };
}

function normalizeSituacao(status: string): 'Ativa' | 'Suspensa' | 'Baixada' {
  const lower = status.toLowerCase();
  if (lower.includes('ativa')) return 'Ativa';
  if (lower.includes('suspensa')) return 'Suspensa';
  if (lower.includes('baixada')) return 'Baixada';
  return 'Ativa';
}

function normalizePorte(size?: string): 'ME' | 'EPP' | 'Demais' {
  if (!size) return 'Demais';
  const upper = size.toUpperCase();
  if (upper === 'ME') return 'ME';
  if (upper === 'EPP') return 'EPP';
  return 'Demais';
}

// ============================================================================
// API PRINCIPAL
// ============================================================================

/**
 * Busca dados de uma empresa por CNPJ (com cache inteligente)
 */
export async function getCompanyDetails(cnpj: string): Promise<Empresa | null> {
  const sanitizedCNPJ = cnpj.replace(/\D/g, '');

  if (sanitizedCNPJ.length !== 14) {
    throw new Error(`CNPJ inválido: ${cnpj}`);
  }

  // 1. Tentar cache primeiro
  const cached = await getFromCache(sanitizedCNPJ);
  if (cached) {
    console.log(`✅ CNPJ ${sanitizedCNPJ} encontrado no cache`);
    return cached;
  }

  // 2. Buscar na API CNPJá
  console.log(`🌐 Buscando CNPJ ${sanitizedCNPJ} na API CNPJá...`);
  
  if (!CNPJA_API_KEY) {
    console.error('❌ CNPJA_API_KEY não configurada');
    throw new Error('API CNPJá não configurada. Defina VITE_CNPJA_API_KEY no .env.local');
  }

  const response = await fetch(`${CNPJA_API_BASE}/companies/${sanitizedCNPJ}`, {
    headers: {
      'Authorization': `Bearer ${CNPJA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.warn(`❌ CNPJ ${sanitizedCNPJ} não encontrado na API CNPJá`);
      return null;
    }
    throw new Error(`Erro da API CNPJá: ${response.status} ${response.statusText}`);
  }

  const data: CNPJaCompanyResponse = await response.json();
  const empresa = mapCNPJaToEmpresa(data);

  // 3. Salvar no cache
  await saveToCache(empresa);

  console.log(`✅ CNPJ ${sanitizedCNPJ} buscado e cacheado`);
  return empresa;
}

/**
 * Busca empresas relacionadas a um sócio (CPF ou CNPJ)
 */
export async function findCompaniesBySocio(cpfOrCnpj: string): Promise<Empresa[]> {
  const sanitized = cpfOrCnpj.replace(/\D/g, '');

  if (!CNPJA_API_KEY) {
    throw new Error('API CNPJá não configurada');
  }

  const response = await fetch(`${CNPJA_API_BASE}/office?members=${sanitized}`, {
    headers: {
      'Authorization': `Bearer ${CNPJA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro da API CNPJá: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const empresas: Empresa[] = [];

  for (const company of data.companies || []) {
    const details = await getCompanyDetails(company.tax_id);
    if (details) empresas.push(details);
  }

  return empresas;
}

/**
 * Busca avançada de empresas por filtros
 */
export async function searchCompanies(filters: CNPJaSearchFilters): Promise<Empresa[]> {
  const params = new URLSearchParams();
  
  if (filters.cnae) params.append('activity', filters.cnae);
  if (filters.uf) params.append('state', filters.uf);
  if (filters.cidade) params.append('city', filters.cidade);
  if (filters.situacao) params.append('status', filters.situacao);
  if (filters.porte) params.append('size', filters.porte);
  if (filters.createdAfter) params.append('founded_after', filters.createdAfter.toISOString());
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());

  if (!CNPJA_API_KEY) {
    throw new Error('API CNPJá não configurada');
  }

  const response = await fetch(`${CNPJA_API_BASE}/companies?${params}`, {
    headers: {
      'Authorization': `Bearer ${CNPJA_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro da API CNPJá: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const empresas: Empresa[] = [];

  for (const company of data.companies || []) {
    const mapped = mapCNPJaToEmpresa(company);
    empresas.push(mapped);
    await saveToCache(mapped); // Cache preventivo
  }

  return empresas;
}

/**
 * Busca dados de uma lista de CNPJs (com progresso)
 * FUNÇÃO COMPATÍVEL COM CÓDIGO EXISTENTE
 */
export async function fetchEmpresasData(
  cnpjs: string[],
  onProgress: ProgressCallback
): Promise<Empresa[]> {
  console.log(`🚀 Iniciando busca REAL de ${cnpjs.length} CNPJs via API CNPJá`);
  const empresas: Empresa[] = [];

  for (let i = 0; i < cnpjs.length; i++) {
    const cnpj = cnpjs[i];
    
    try {
      const empresa = await getCompanyDetails(cnpj);
      if (empresa) {
        empresas.push(empresa);
      } else {
        console.warn(`❌ CNPJ ${cnpj} não encontrado`);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar CNPJ ${cnpj}:`, error);
    }
    
    onProgress(i + 1, cnpjs.length);
    
    // Rate limiting: 1 request/segundo (API CNPJá limita a 60/min)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`✅ Busca finalizada: ${empresas.length}/${cnpjs.length} empresas encontradas`);
  return empresas;
}