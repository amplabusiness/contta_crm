import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SocioResumo {
  nome_socio: string;
  cpf_parcial: string;
  qualificacao: string;
  percentual_capital: number;
}

interface EmpresaLookup {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_abertura: string | null;
  porte: string;
  endereco_principal: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  cnae_principal: {
    codigo: string;
    descricao: string;
  };
  quadro_socios: SocioResumo[];
  telefones: string[];
  emails: string[];
}

type LookupResult = EmpresaLookup;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const sanitizeDigits = (value: string): string => value.replace(/[^\d]/g, '');

const sliceCpf = (value: string): string => sanitizeDigits(value).slice(0, 11);

const normalizeTelefoneList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeEmailList = normalizeTelefoneList;

const buildEndereco = (data: {
  logradouro?: unknown;
  numero?: unknown;
  number?: unknown;
  street?: unknown;
  bairro?: unknown;
  district?: unknown;
  cidade?: unknown;
  municipio?: unknown;
  city?: unknown;
  uf?: unknown;
  estado?: unknown;
  state?: unknown;
  cep?: unknown;
  zip?: unknown;
}): EmpresaLookup['endereco_principal'] => {
  const cepValue = data.cep ?? data.zip;
  return {
    logradouro: asString(data.logradouro ?? data.street ?? ''),
    numero: asString(data.numero ?? data.number ?? ''),
    bairro: asString(data.bairro ?? data.district ?? ''),
    cidade: asString(data.cidade ?? data.municipio ?? data.city ?? ''),
    uf: asString(data.uf ?? data.estado ?? data.state ?? ''),
    cep: cepValue ? sanitizeDigits(asString(cepValue)) : '',
  };
};

const buildSocioList = (value: unknown, mapping: (item: Record<string, unknown>) => SocioResumo): SocioResumo[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => mapping(item));
};

// Função para buscar CNPJ em diferentes APIs
async function buscarCNPJ(cnpj: string): Promise<LookupResult> {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  
  // Tentar BrasilAPI primeiro (gratuito, sem chave)
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      return transformarDadosBrasilAPI(data);
    }
  } catch (error) {
    console.warn('BrasilAPI falhou, tentando ReceitaWS...', error);
  }

  // Tentar ReceitaWS (gratuito, limitado)
  try {
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      if (data.status === 'OK') {
        return transformarDadosReceitaWS(data);
      }
    }
  } catch (error) {
    console.warn('ReceitaWS falhou, tentando CNPJA...', error);
  }

  // Tentar CNPJA (requer chave)
  const cnpjaKey = process.env.CNPJA_API_KEY;
  if (cnpjaKey) {
    try {
      const response = await fetch(`https://www.cnpja.com/api/v1/company/${cnpjLimpo}`, {
        headers: {
          'Authorization': `Bearer ${cnpjaKey}`
        }
      });
      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>;
        return transformarDadosCNPJA(data);
      }
    } catch (error) {
      console.error('CNPJA API error:', error);
    }
  }

  throw new Error('Não foi possível buscar o CNPJ em nenhuma API disponível');
}

// Transformar dados da BrasilAPI para formato interno
function transformarDadosBrasilAPI(data: Record<string, unknown>): LookupResult {
  const cnaePrincipal = isRecord(data.cnae_fiscal_principal) ? data.cnae_fiscal_principal : undefined;

  return {
    cnpj: sanitizeDigits(asString(data.cnpj)),
    razao_social: asString(data.razao_social),
    nome_fantasia: asString(data.nome_fantasia) || asString(data.razao_social),
    situacao_cadastral: asString(data.descricao_situacao_cadastral, 'Ativa'),
    data_abertura: asString(data.data_inicio_atividade) || null,
    porte: asString(data.porte, 'Demais'),
    endereco_principal: buildEndereco({
      logradouro: data.logradouro,
      numero: data.numero,
      bairro: data.bairro,
      cidade: data.municipio,
      uf: data.uf,
      cep: data.cep,
    }),
    cnae_principal: {
      codigo: cnaePrincipal ? asString(cnaePrincipal['codigo']) : '',
      descricao: cnaePrincipal ? asString(cnaePrincipal['descricao']) : '',
    },
    quadro_socios: buildSocioList(data.qsa, (socio) => ({
      nome_socio: asString(socio.nome),
      cpf_parcial: socio.cpf_cnpj ? sliceCpf(asString(socio.cpf_cnpj)) : '',
      qualificacao: asString(socio.qual),
      percentual_capital: asNumber(socio.participacao),
    })),
    telefones: normalizeTelefoneList(data.telefones),
    emails: normalizeEmailList(data.emails),
  };
}

// Transformar dados da ReceitaWS para formato interno
function transformarDadosReceitaWS(data: Record<string, unknown>): LookupResult {
  const atividadePrincipal = Array.isArray(data.atividade_principal)
    ? data.atividade_principal.find(isRecord)
    : undefined;

  return {
    cnpj: sanitizeDigits(asString(data.cnpj)),
    razao_social: asString(data.nome),
    nome_fantasia: asString(data.fantasia) || asString(data.nome),
    situacao_cadastral: asString(data.situacao, 'Ativa'),
    data_abertura: asString(data.abertura) || null,
    porte: asString(data.porte, 'Demais'),
    endereco_principal: buildEndereco({
      logradouro: data.logradouro,
      numero: data.numero,
      bairro: data.bairro,
      cidade: data.municipio,
      uf: data.uf,
      cep: data.cep,
    }),
    cnae_principal: {
      codigo: atividadePrincipal ? asString(atividadePrincipal['code']) : '',
      descricao: atividadePrincipal ? asString(atividadePrincipal['text']) : '',
    },
    quadro_socios: buildSocioList(data.qsa, (socio) => ({
      nome_socio: asString(socio.nome),
      cpf_parcial: socio.cpf ? sliceCpf(asString(socio.cpf)) : '',
      qualificacao: asString(socio.qual),
      percentual_capital: 0,
    })),
    telefones: data.telefone ? [asString(data.telefone)] : [],
    emails: data.email ? [asString(data.email)] : [],
  };
}

// Transformar dados da CNPJA para formato interno
function transformarDadosCNPJA(data: Record<string, unknown>): LookupResult {
  const address = isRecord(data.address) ? data.address : {};
  const primaryActivity = isRecord(data.primary_activity) ? data.primary_activity : {};

  return {
    cnpj: sanitizeDigits(asString(data.cnpj)),
    razao_social: asString(data.name),
    nome_fantasia: asString(data.alias) || asString(data.name),
    situacao_cadastral: asString(data.status, 'Ativa'),
    data_abertura: asString(data.opened) || null,
    porte: asString(data.size, 'Demais'),
    endereco_principal: buildEndereco({
      street: address.street,
      number: address.number,
      district: address.district,
      city: address.city,
      state: address.state,
      zip: address.zip,
    }),
    cnae_principal: {
      codigo: asString(primaryActivity['code']),
      descricao: asString(primaryActivity['text']),
    },
    quadro_socios: buildSocioList(data.partners, (socio) => ({
      nome_socio: asString(socio.name),
      cpf_parcial: socio.document ? sliceCpf(asString(socio.document)) : '',
      qualificacao: asString(socio.qualification),
      percentual_capital: asNumber(socio.share),
    })),
    telefones: normalizeTelefoneList(data.phones),
    emails: normalizeEmailList(data.emails),
  };
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    if (request.method === 'GET') {
      const { cnpj } = request.query;
      
      if (!cnpj || typeof cnpj !== 'string') {
        response.status(400).json({ message: 'CNPJ é obrigatório' });
        return;
      }

      const dadosEmpresa = await buscarCNPJ(cnpj);
      response.status(200).json(dadosEmpresa);
    } else if (request.method === 'POST') {
      const { cnpjs } = request.body;
      
      if (!Array.isArray(cnpjs) || cnpjs.length === 0) {
        response.status(400).json({ message: 'Lista de CNPJs é obrigatória' });
        return;
      }

      const resultados: Array<{ cnpj: string; sucesso: true; dados: LookupResult }> = [];
      const erros: Array<{ cnpj: string; sucesso: false; erro: string }> = [];

      for (const cnpj of cnpjs) {
        try {
          const dados = await buscarCNPJ(cnpj);
          resultados.push({ cnpj, sucesso: true, dados });
          // Delay para evitar rate limit
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha desconhecida ao consultar CNPJ';
          erros.push({ cnpj, sucesso: false, erro: message });
        }
      }

      response.status(200).json({
        total: cnpjs.length,
        sucessos: resultados.length,
        totalErros: erros.length,
        resultados,
        erros
      });
    } else {
      response.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in CNPJ lookup API:', error);
    response.status(500).json({ message });
  }
}

