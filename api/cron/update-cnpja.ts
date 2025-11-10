import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Vercel Cron Job: Atualização diária do cache CNPJá
 * 
 * Schedule: 0 3 * * * (diariamente às 3h AM)
 * 
 * Executa o script update-cnpja-cache.ts via Vercel Serverless Function
 * Atualiza empresas com dados desatualizados (> 90 dias) via CNPJá API
 */

interface Empresa {
  cnpj: string;
  razao_social: string;
  data_ultima_atualizacao?: string;
}

const BATCH_SIZE = 50;
const STALE_THRESHOLD_DAYS = 90;
const RATE_LIMIT_MS = 3000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validar segurança: apenas Vercel Cron pode executar
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Inicializar Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Buscar empresas desatualizadas
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - STALE_THRESHOLD_DAYS);

    const { data: staleCompanies, error: fetchError } = await supabase
      .from('empresas')
      .select('cnpj, razao_social, data_ultima_atualizacao')
      .or(`data_ultima_atualizacao.is.null,data_ultima_atualizacao.lt.${thresholdDate.toISOString()}`)
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!staleCompanies || staleCompanies.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma empresa desatualizada encontrada',
        updated: 0,
      });
    }

    // 2. Atualizar empresas via CNPJá API
    let updated = 0;
    let errors = 0;

    for (const empresa of staleCompanies) {
      try {
        // Fazer requisição à CNPJá API
        const response = await fetch(
          `https://api.cnpja.com/office/${empresa.cnpj.replace(/\D/g, '')}`,
          {
            headers: {
              Authorization: process.env.CNPJA_API_KEY || '',
            },
          }
        );

        if (!response.ok) {
          errors++;
          continue;
        }

        const data = await response.json();

        // Atualizar no Supabase
        const { error: updateError } = await supabase
          .from('empresas')
          .update({
            razao_social: data.company?.name || empresa.razao_social,
            nome_fantasia: data.alias || null,
            situacao_cadastral: data.status?.text || null,
            data_situacao_cadastral: data.status?.date || null,
            capital_social: data.equity ? parseFloat(data.equity) : null,
            natureza_juridica: data.company?.nature?.text || null,
            porte: data.size?.text || null,
            logradouro: data.address?.street || null,
            numero: data.address?.number || null,
            complemento: data.address?.details || null,
            bairro: data.address?.district || null,
            cidade: data.address?.city || null,
            uf: data.address?.state || null,
            cep: data.address?.zip || null,
            telefones: data.phones ? data.phones.map((p: any) => p.number) : [],
            emails: data.emails ? data.emails.map((e: any) => e.address) : [],
            data_ultima_atualizacao: new Date().toISOString(),
          })
          .eq('cnpj', empresa.cnpj);

        if (updateError) {
          errors++;
          continue;
        }

        updated++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
      } catch (err) {
        errors++;
        console.error(`Erro ao atualizar ${empresa.cnpj}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Atualização concluída',
      total: staleCompanies.length,
      updated,
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
