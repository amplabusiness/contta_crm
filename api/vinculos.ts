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

interface SocioPayload {
  cpf_parcial: string;
  nome?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const socios: SocioPayload[] = Array.isArray(body?.socios) ? body.socios : [];
    const empresaReferencia: string | undefined = body?.empresaCnpj;

    if (socios.length === 0) {
      return res.status(400).json({ success: false, error: 'Envie ao menos um sócio na requisição.' });
    }

    const dedup = Array.from(new Map(socios.map((s) => [s.cpf_parcial?.replace(/\D/g, ''), s])).entries())
      .filter(([cpf]) => cpf && cpf.length > 0)
      .map(([cpf, socio]) => ({ cpf_parcial: cpf, nome: socio.nome }));

    const redes = await Promise.all(
      dedup.map(async (socio) => {
        const vinculos = await buscarEmpresasDoSocio(
          socio.cpf_parcial,
          empresaReferencia ? empresaReferencia.replace(/\D/g, '') : undefined
        );

        return {
          socio_nome: socio.nome || socio.cpf_parcial,
          vinculos,
        };
      })
    );

    return res.status(200).json({ success: true, redes });
  } catch (error: any) {
    console.error('❌ Erro em /api/vinculos:', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao buscar vínculos.' });
  }
}

async function buscarEmpresasDoSocio(cpf: string, empresaReferencia?: string) {
  const MAX_EMPRESAS = 12;

  const { data: relacoes, error } = await supabase
    .from('empresa_socios')
    .select('empresa_cnpj')
    .eq('socio_cpf_parcial', cpf)
    .limit(MAX_EMPRESAS * 2);

  if (error) {
    console.error('Erro ao buscar relacionamentos do sócio:', error);
    throw error;
  }

  const cnpjs = (relacoes || [])
    .map((rel) => rel.empresa_cnpj)
    .filter(Boolean)
    .map((cnpj) => cnpj.replace(/\D/g, ''))
    .filter((cnpj) => !empresaReferencia || cnpj !== empresaReferencia)
    .slice(0, MAX_EMPRESAS);

  if (cnpjs.length === 0) {
    return [] as Array<{
      empresa_vinculada_cnpj: string;
      empresa_vinculada_nome: string;
      grau_vinculo: number;
      tipo_vinculo: 'direto' | 'indireto_socio' | 'indireto_parente';
    }>;
  }

  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('cnpj, razao_social, nome_fantasia')
    .in('cnpj', cnpjs);

  if (empresasError) {
    console.error('Erro ao buscar nomes das empresas relacionadas:', empresasError);
    throw empresasError;
  }

  return (empresas || []).map((empresa) => ({
    empresa_vinculada_cnpj: empresa.cnpj,
    empresa_vinculada_nome: empresa.nome_fantasia || empresa.razao_social,
    grau_vinculo: 1,
    tipo_vinculo: 'direto' as const,
  }));
}
