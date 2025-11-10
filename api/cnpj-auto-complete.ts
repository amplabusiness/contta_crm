import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const CNPJA_API_KEY = process.env.CNPJA_API_KEY || process.env.VITE_CNPJA_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CNPJA_API_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas');
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

interface CNPJACompany {
  taxId: string;
  name: string;
  alias?: string;
  founded?: string;
  head?: boolean;
  statusDate?: string;
  status?: {
    id: number;
    text: string;
  };
  address?: {
    street: string;
    number: string;
    details?: string;
    district: string;
    city: string;
    state: string;
    zip: string;
  };
  phones?: Array<{
    area: string;
    number: string;
  }>;
  emails?: Array<{
    address: string;
    domain: string;
  }>;
  mainActivity?: {
    id: number;
    text: string;
  };
  nature?: {
    id: number;
    text: string;
  };
  size?: {
    id: number;
    acronym: string;
    text: string;
  };
  capital?: number;
  members?: Array<{
    since?: string;
    role?: {
      id: number;
      text: string;
    };
    person?: {
      id: string;
      name: string;
      type: string;
      taxId: string;
    };
  }>;
}

/**
 * API Endpoint: Auto-Complete de CNPJ
 * 
 * Fluxo Inteligente:
 * 1. Verifica cache Supabase (empresas)
 * 2. Se não existe ou dados antigos (>90 dias), busca CNPJá
 * 3. Salva/atualiza empresa + sócios no Supabase
 * 4. Retorna dados formatados para formulário
 * 
 * GET /api/cnpj-auto-complete?cnpj=00000000000191
 * 
 * Response:
 * {
 *   success: true,
 *   empresa: { cnpj, razao_social, ... },
 *   socios: [{ nome, cpf_cnpj, qualificacao, ... }],
 *   fromCache: true/false
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cnpj } = req.query;

    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'CNPJ não fornecido' 
      });
    }

    const cnpjClean = cnpj.replace(/\D/g, '');

    if (cnpjClean.length !== 14) {
      return res.status(400).json({ 
        success: false, 
        error: 'CNPJ inválido (deve ter 14 dígitos)' 
      });
    }

    console.log(`🔍 Buscando CNPJ: ${cnpjClean}`);

    // ========================================
    // 1. VERIFICAR CACHE NO SUPABASE
    // ========================================
    const { data: empresaCache, error: cacheError } = await supabase
      .from('empresas')
      .select(`
        *,
        empresa_socios (
          socios (*)
        )
      `)
      .eq('cnpj', cnpjClean)
      .single();

    if (!cacheError && empresaCache) {
      const dataAtualizacao = new Date(empresaCache.updated_at || empresaCache.created_at);
      const idade = Date.now() - dataAtualizacao.getTime();
      const maxIdade = 90 * 24 * 60 * 60 * 1000; // 90 dias

      if (idade < maxIdade) {
        console.log('📦 Usando cache Supabase (dados atualizados)');

        // Formatar sócios
        const socios = empresaCache.empresa_socios?.map((es: any) => ({
          cpf_cnpj: es.socios.cpf_cnpj,
          nome: es.socios.nome,
          qualificacao: es.socios.qualificacao,
          data_entrada: es.data_entrada,
          percentual_capital: es.percentual_capital
        })) || [];

        return res.status(200).json({
          success: true,
          empresa: {
            cnpj: empresaCache.cnpj,
            razao_social: empresaCache.razao_social,
            nome_fantasia: empresaCache.nome_fantasia,
            cnae_principal: empresaCache.cnae_principal,
            descricao_cnae: empresaCache.descricao_cnae,
            natureza_juridica: empresaCache.natureza_juridica,
            porte_empresa: empresaCache.porte_empresa,
            capital_social: empresaCache.capital_social,
            data_abertura: empresaCache.data_abertura,
            situacao_cadastral: empresaCache.situacao_cadastral,
            endereco: empresaCache.endereco,
            telefone: empresaCache.telefone,
            email: empresaCache.email
          },
          socios,
          fromCache: true,
          cacheAge: Math.floor(idade / (24 * 60 * 60 * 1000)) // dias
        });
      } else {
        console.log('⚠️ Cache expirado (>90 dias), buscando dados atualizados...');
      }
    }

    // ========================================
    // 2. BUSCAR NA API CNPJá
    // ========================================
    console.log('🌐 Consultando API CNPJá...');

    const cnpjaResponse = await fetch(
      `https://api.cnpja.com/office/${cnpjClean}`,
      {
        headers: {
          'Authorization': CNPJA_API_KEY!
        }
      }
    );

    if (!cnpjaResponse.ok) {
      const errorText = await cnpjaResponse.text();
      console.error('❌ Erro CNPJá:', errorText);
      
      return res.status(cnpjaResponse.status).json({
        success: false,
        error: `Erro ao consultar CNPJá: ${cnpjaResponse.status}`,
        details: errorText
      });
    }

    const cnpjaData: CNPJACompany = await cnpjaResponse.json();

    // ========================================
    // 3. SALVAR/ATUALIZAR NO SUPABASE
    // ========================================
    console.log('💾 Salvando dados no Supabase...');

    // Preparar dados da empresa
    const empresaData = {
      cnpj: cnpjClean,
      razao_social: cnpjaData.name,
      nome_fantasia: cnpjaData.alias || null,
      cnae_principal: cnpjaData.mainActivity?.id?.toString() || null,
      descricao_cnae: cnpjaData.mainActivity?.text || null,
      natureza_juridica: cnpjaData.nature?.text || null,
      porte_empresa: cnpjaData.size?.acronym || null,
      capital_social: cnpjaData.capital || null,
      data_abertura: cnpjaData.founded || null,
      situacao_cadastral: cnpjaData.status?.text || null,
      endereco: cnpjaData.address ? {
        logradouro: cnpjaData.address.street,
        numero: cnpjaData.address.number,
        complemento: cnpjaData.address.details,
        bairro: cnpjaData.address.district,
        municipio: cnpjaData.address.city,
        uf: cnpjaData.address.state,
        cep: cnpjaData.address.zip
      } : null,
      telefone: cnpjaData.phones?.[0] ? 
        `(${cnpjaData.phones[0].area}) ${cnpjaData.phones[0].number}` : null,
      email: cnpjaData.emails?.[0]?.address || null,
      updated_at: new Date().toISOString()
    };

    // Upsert empresa
    const { data: empresaSalva, error: empresaError } = await supabase
      .from('empresas')
      .upsert(empresaData, { onConflict: 'cnpj' })
      .select()
      .single();

    if (empresaError) {
      console.error('❌ Erro ao salvar empresa:', empresaError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar empresa no banco de dados',
        details: empresaError.message
      });
    }

    // ========================================
    // 4. SALVAR SÓCIOS
    // ========================================
    const sociosSalvos = [];

    if (cnpjaData.members && cnpjaData.members.length > 0) {
      console.log(`👥 Salvando ${cnpjaData.members.length} sócios...`);

      for (const member of cnpjaData.members) {
        if (!member.person) continue;

        const socioData = {
          cpf_cnpj: member.person.taxId,
          nome: member.person.name,
          qualificacao: member.role?.text || 'Sócio',
          tipo_pessoa: member.person.type === 'NATURAL' ? 'PF' : 'PJ'
        };

        // Upsert sócio
        const { data: socio, error: socioError } = await supabase
          .from('socios')
          .upsert(socioData, { onConflict: 'cpf_cnpj' })
          .select()
          .single();

        if (socioError) {
          console.error('⚠️ Erro ao salvar sócio:', socioError);
          continue;
        }

        // Criar relação empresa-sócio
        const relacaoData = {
          empresa_cnpj: cnpjClean,
          socio_cpf_cnpj: member.person.taxId,
          data_entrada: member.since || null,
          qualificacao: member.role?.text || 'Sócio',
          percentual_capital: null // CNPJá não fornece
        };

        const { error: relacaoError } = await supabase
          .from('empresa_socios')
          .upsert(relacaoData, { 
            onConflict: 'empresa_cnpj,socio_cpf_cnpj' 
          });

        if (relacaoError) {
          console.error('⚠️ Erro ao salvar relação:', relacaoError);
        }

        sociosSalvos.push({
          cpf_cnpj: member.person.taxId,
          nome: member.person.name,
          qualificacao: member.role?.text || 'Sócio',
          data_entrada: member.since
        });
      }
    }

    console.log('✅ Dados salvos com sucesso!');

    // ========================================
    // 5. RETORNAR RESPOSTA
    // ========================================
    return res.status(200).json({
      success: true,
      empresa: {
        cnpj: cnpjClean,
        razao_social: cnpjaData.name,
        nome_fantasia: cnpjaData.alias,
        cnae_principal: cnpjaData.mainActivity?.id?.toString(),
        descricao_cnae: cnpjaData.mainActivity?.text,
        natureza_juridica: cnpjaData.nature?.text,
        porte_empresa: cnpjaData.size?.acronym,
        capital_social: cnpjaData.capital,
        data_abertura: cnpjaData.founded,
        situacao_cadastral: cnpjaData.status?.text,
        endereco: empresaData.endereco,
        telefone: empresaData.telefone,
        email: empresaData.email
      },
      socios: sociosSalvos,
      fromCache: false,
      totalSocios: sociosSalvos.length
    });

  } catch (error) {
    console.error('❌ Erro no handler:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
