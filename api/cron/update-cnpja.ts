import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface EmpresaDb {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  data_ultima_atualizacao: string | null;
  created_at: string;
}

interface CnpjaResponse {
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_abertura?: string;
  porte?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  cnae_fiscal?: string;
  cnae_fiscal_descricao?: string;
  email?: string;
  telefone?: string;
}

const DAYS_THRESHOLD = 90;
const DEFAULT_BATCH = 5;
const RATE_LIMIT_MS = 3000;

const sanitizeCnpj = (cnpj: string) => cnpj.replace(/[^\d]/g, '');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchStaleCompanies(supabase: SupabaseClient, batch: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_THRESHOLD);

  const { data, error } = await supabase
    .from('empresas')
    .select('cnpj, razao_social, nome_fantasia, data_ultima_atualizacao, created_at')
    .or(
      `data_ultima_atualizacao.is.null,data_ultima_atualizacao.lt.${cutoff.toISOString()}`,
    )
    .order('data_ultima_atualizacao', { ascending: true, nullsFirst: true })
    .limit(batch);

  if (error) {
    throw new Error(`Erro ao buscar empresas: ${error.message}`);
  }

  return (data || []) as EmpresaDb[];
}

async function fetchCnpjData(cnpj: string) {
  const sanitized = sanitizeCnpj(cnpj);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (process.env.CNPJA_API_KEY) {
    headers.Authorization = process.env.CNPJA_API_KEY;
  }

  const response = await fetch(`https://api.cnpja.com/office/${sanitized}`, {
    headers,
  });

  if (response.status === 429) {
    return { rateLimited: true } as const;
  }

  if (!response.ok) {
    return { error: `HTTP ${response.status}` } as const;
  }

  const payload = (await response.json()) as CnpjaResponse;
  return { data: payload } as const;
}

async function updateCompany(supabase: SupabaseClient, cnpj: string, payload: CnpjaResponse) {
  const updatePayload = {
    razao_social: payload.razao_social,
    nome_fantasia: payload.nome_fantasia || payload.razao_social,
    situacao_cadastral: payload.situacao_cadastral,
    data_abertura: payload.data_abertura,
    porte: payload.porte,
    logradouro: payload.logradouro,
    numero: payload.numero,
    bairro: payload.bairro,
    cidade: payload.municipio,
    uf: payload.uf,
    cep: payload.cep,
    cnae_principal_codigo: payload.cnae_fiscal,
    cnae_principal_descricao: payload.cnae_fiscal_descricao,
    emails: payload.email ? [payload.email] : [],
    telefones: payload.telefone ? [payload.telefone] : [],
    data_ultima_atualizacao: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('empresas')
    .update(updatePayload)
    .eq('cnpj', cnpj);

  if (error) {
    throw new Error(`Erro ao atualizar empresa ${cnpj}: ${error.message}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase não configurado' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  const batchParam = Number(req.query.limit);
  const batch = Number.isFinite(batchParam) && batchParam > 0 ? Math.min(batchParam, 25) : DEFAULT_BATCH;

  try {
    const companies = await fetchStaleCompanies(supabase, batch);

    if (companies.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        updated: 0,
        skipped: 0,
        message: 'Nenhuma empresa desatualizada encontrada',
      });
    }

    let updated = 0;
    let skipped = 0;
    const errors: Array<{ cnpj: string; message: string }> = [];

    for (const company of companies) {
      const result = await fetchCnpjData(company.cnpj);

      if ('rateLimited' in result) {
        skipped++;
        errors.push({ cnpj: company.cnpj, message: 'Rate limited pela CNPJá' });
        break;
      }

      if ('error' in result) {
        skipped++;
        errors.push({ cnpj: company.cnpj, message: result.error });
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      try {
  await updateCompany(supabase, company.cnpj, result.data);
        updated++;
      } catch (error) {
        skipped++;
        errors.push({
          cnpj: company.cnpj,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }

      await sleep(RATE_LIMIT_MS);
    }

    return res.status(200).json({
      success: true,
      processed: companies.length,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Erro no cron update-cnpja:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
