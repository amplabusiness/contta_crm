import type { VercelRequest, VercelResponse } from '@vercel/node';

// Função para buscar CNPJ em diferentes APIs
async function buscarCNPJ(cnpj: string): Promise<any> {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  
  // Tentar BrasilAPI primeiro (gratuito, sem chave)
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    if (response.ok) {
      const data = await response.json();
      return transformarDadosBrasilAPI(data);
    }
  } catch (error) {
    console.log('BrasilAPI falhou, tentando ReceitaWS...');
  }

  // Tentar ReceitaWS (gratuito, limitado)
  try {
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK') {
        return transformarDadosReceitaWS(data);
      }
    }
  } catch (error) {
    console.log('ReceitaWS falhou, tentando CNPJA...');
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
        const data = await response.json();
        return transformarDadosCNPJA(data);
      }
    } catch (error) {
      console.error('CNPJA API error:', error);
    }
  }

  throw new Error('Não foi possível buscar o CNPJ em nenhuma API disponível');
}

// Transformar dados da BrasilAPI para formato interno
function transformarDadosBrasilAPI(data: any) {
  return {
    cnpj: data.cnpj,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia || data.razao_social,
    situacao_cadastral: data.descricao_situacao_cadastral || 'Ativa',
    data_abertura: data.data_inicio_atividade,
    porte: data.porte || 'Demais',
    endereco_principal: {
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep?.replace(/[^\d]/g, '') || '',
    },
    cnae_principal: {
      codigo: data.cnae_fiscal_principal?.codigo || '',
      descricao: data.cnae_fiscal_principal?.descricao || '',
    },
    quadro_socios: (data.qsa || []).map((socio: any) => ({
      nome_socio: socio.nome,
      cpf_parcial: socio.cpf_cnpj?.replace(/[^\d]/g, '').substring(0, 11) || '',
      qualificacao: socio.qual || '',
      percentual_capital: socio.participacao || 0,
    })),
    telefones: data.telefones || [],
    emails: data.emails || [],
  };
}

// Transformar dados da ReceitaWS para formato interno
function transformarDadosReceitaWS(data: any) {
  return {
    cnpj: data.cnpj,
    razao_social: data.nome,
    nome_fantasia: data.fantasia || data.nome,
    situacao_cadastral: data.situacao || 'Ativa',
    data_abertura: data.abertura,
    porte: data.porte || 'Demais',
    endereco_principal: {
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep?.replace(/[^\d]/g, '') || '',
    },
    cnae_principal: {
      codigo: data.atividade_principal?.[0]?.code || '',
      descricao: data.atividade_principal?.[0]?.text || '',
    },
    quadro_socios: (data.qsa || []).map((socio: any) => ({
      nome_socio: socio.nome,
      cpf_parcial: socio.cpf?.replace(/[^\d]/g, '').substring(0, 11) || '',
      qualificacao: socio.qual || '',
      percentual_capital: 0,
    })),
    telefones: data.telefone ? [data.telefone] : [],
    emails: data.email ? [data.email] : [],
  };
}

// Transformar dados da CNPJA para formato interno
function transformarDadosCNPJA(data: any) {
  return {
    cnpj: data.cnpj,
    razao_social: data.name,
    nome_fantasia: data.alias || data.name,
    situacao_cadastral: data.status || 'Ativa',
    data_abertura: data.opened,
    porte: data.size || 'Demais',
    endereco_principal: {
      logradouro: data.address?.street || '',
      numero: data.address?.number || '',
      bairro: data.address?.district || '',
      cidade: data.address?.city || '',
      uf: data.address?.state || '',
      cep: data.address?.zip?.replace(/[^\d]/g, '') || '',
    },
    cnae_principal: {
      codigo: data.primary_activity?.code || '',
      descricao: data.primary_activity?.text || '',
    },
    quadro_socios: (data.partners || []).map((socio: any) => ({
      nome_socio: socio.name,
      cpf_parcial: socio.document?.replace(/[^\d]/g, '').substring(0, 11) || '',
      qualificacao: socio.qualification || '',
      percentual_capital: socio.share || 0,
    })),
    telefones: data.phones || [],
    emails: data.emails || [],
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

      const resultados = [];
      const erros = [];

      for (const cnpj of cnpjs) {
        try {
          const dados = await buscarCNPJ(cnpj);
          resultados.push({ cnpj, sucesso: true, dados });
          // Delay para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          erros.push({ cnpj, sucesso: false, erro: error.message });
        }
      }

      response.status(200).json({
        total: cnpjs.length,
        sucessos: resultados.length,
        erros: erros.length,
        resultados,
        erros
      });
    } else {
      response.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in CNPJ lookup API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

