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

interface ParenteResponseItem {
  cpf_parcial_relacionado: string;
  nome_relacionado: string;
  tipo_descoberta: string;
  confiabilidade: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { cpf } = req.query;

  if (!cpf || typeof cpf !== 'string') {
    return res.status(400).json({ success: false, error: 'Parâmetro cpf é obrigatório' });
  }

  const cpfSanitized = cpf.replace(/\D/g, '');

  if (cpfSanitized.length < 6) {
    return res.status(400).json({ success: false, error: 'CPF inválido' });
  }

  try {
    const socioPrincipal = await getSocio(cpfSanitized);

    if (!socioPrincipal) {
      return res.status(404).json({ success: false, error: 'Sócio não encontrado' });
    }

    const empresasParticipantes = await getEmpresasDoSocio(cpfSanitized);

    if (empresasParticipantes.length === 0) {
      return res.status(200).json({
        success: true,
        socio: socioPrincipal,
        parentes: [] as ParenteResponseItem[],
      });
    }

    const sociosConectados = await getSociosDasEmpresas(empresasParticipantes);

    const parentes = identificarParentes(
      socioPrincipal,
      sociosConectados.filter((s) => s.cpf_parcial !== cpfSanitized)
    );

    return res.status(200).json({
      success: true,
      socio: socioPrincipal,
      parentes,
    });
  } catch (error: any) {
    console.error('❌ Erro em /api/genealogy-relatives:', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao buscar parentes' });
  }
}

async function getSocio(cpf: string) {
  const { data, error } = await supabase
    .from('socios')
    .select('cpf_parcial, nome_socio')
    .eq('cpf_parcial', cpf)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar sócio:', error);
    throw error;
  }

  return data;
}

async function getEmpresasDoSocio(cpf: string) {
  const { data, error } = await supabase
    .from('empresa_socios')
    .select('empresa_cnpj, qualificacao, percentual_capital')
    .eq('socio_cpf_parcial', cpf);

  if (error) {
    console.error('Erro ao buscar empresas do sócio:', error);
    throw error;
  }

  return data || [];
}

async function getSociosDasEmpresas(
  relacoes: Array<{ empresa_cnpj: string; qualificacao: string | null; percentual_capital: number | null }>
) {
  const cnpjs = Array.from(new Set(relacoes.map((r) => r.empresa_cnpj).filter(Boolean)));

  if (cnpjs.length === 0) {
    return [] as Array<{
      cpf_parcial: string;
      nome_socio: string;
      empresa_cnpj: string;
      qualificacao: string | null;
      percentual_capital: number | null;
    }>;
  }

  const { data, error } = await supabase
    .from('empresa_socios')
    .select('empresa_cnpj, socio_cpf_parcial, qualificacao, percentual_capital')
    .in('empresa_cnpj', cnpjs);

  if (error) {
    console.error('Erro ao buscar sócios das empresas:', error);
    throw error;
  }

  const socioIds = Array.from(new Set((data || []).map((r) => r.socio_cpf_parcial).filter(Boolean)));

  if (socioIds.length === 0) {
    return [] as Array<{
      cpf_parcial: string;
      nome_socio: string;
      empresa_cnpj: string;
      qualificacao: string | null;
      percentual_capital: number | null;
    }>;
  }

  const { data: socios, error: sociosError } = await supabase
    .from('socios')
    .select('cpf_parcial, nome_socio')
    .in('cpf_parcial', socioIds);

  if (sociosError) {
    console.error('Erro ao buscar dados dos sócios relacionados:', sociosError);
    throw sociosError;
  }

  const socioMap = new Map((socios || []).map((s) => [s.cpf_parcial, s.nome_socio]));

  return (data || [])
    .map((item) => ({
      cpf_parcial: item.socio_cpf_parcial,
      nome_socio: socioMap.get(item.socio_cpf_parcial) || 'Sócio não identificado',
      empresa_cnpj: item.empresa_cnpj,
      qualificacao: item.qualificacao,
      percentual_capital: item.percentual_capital != null ? Number(item.percentual_capital) : null,
    }))
    .filter((item) => !!item.cpf_parcial && !!item.nome_socio);
}

function identificarParentes(
  socioPrincipal: { cpf_parcial: string; nome_socio: string },
  candidatos: Array<{
    cpf_parcial: string;
    nome_socio: string;
    empresa_cnpj: string;
    qualificacao: string | null;
    percentual_capital: number | null;
  }>
): ParenteResponseItem[] {
  const parentesPorCpf = new Map<string, ParenteResponseItem & { scoreDetalhado: number }>();
  const sobrenomePrincipal = extrairSobrenome(socioPrincipal.nome_socio);
  const prefixoPrincipal = socioPrincipal.cpf_parcial.slice(0, 6);

  candidatos.forEach((cand) => {
    if (!cand.cpf_parcial) return;

    const sobrenomeCandidato = extrairSobrenome(cand.nome_socio);
    const prefixoCandidato = cand.cpf_parcial.slice(0, 6);

    let score = 0;
    const pistas: string[] = [];

    if (sobrenomePrincipal && sobrenomeCandidato && sobrenomePrincipal === sobrenomeCandidato) {
      score += 45;
      pistas.push(`Mesmo sobrenome (${sobrenomePrincipal})`);
    }

    if (prefixoPrincipal && prefixoCandidato && prefixoPrincipal === prefixoCandidato) {
      score += 25;
      pistas.push('CPF com prefixo igual');
    }

    // Cada empresa compartilhada adiciona 10 pontos (máx 20)
    score += 10;
    pistas.push(`Empresa compartilhada ${cand.empresa_cnpj}`);

    if (score === 0) {
      return;
    }

    const cpfMascarado = mascararCpf(cand.cpf_parcial);

    const existente = parentesPorCpf.get(cand.cpf_parcial);
    const scoreFinal = Math.min((existente?.scoreDetalhado || 0) + score, 95);
    const motivos = existente ? `${existente.tipo_descoberta}; ${pistas.join('; ')}` : pistas.join('; ');

    parentesPorCpf.set(cand.cpf_parcial, {
      cpf_parcial_relacionado: cpfMascarado,
      nome_relacionado: cand.nome_socio,
      tipo_descoberta: motivos,
      confiabilidade: Math.round(scoreFinal),
      scoreDetalhado: scoreFinal,
    });
  });

  return Array.from(parentesPorCpf.values())
    .sort((a, b) => b.confiabilidade - a.confiabilidade)
    .map(({ scoreDetalhado, ...resto }) => resto);
}

function extrairSobrenome(nome: string) {
  if (!nome) return '';
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? partes[partes.length - 1].toUpperCase() : '';
}

function mascararCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, '').padStart(11, '0');
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}
