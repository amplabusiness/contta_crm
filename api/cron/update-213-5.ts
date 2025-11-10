import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Vercel Cron Job: Processamento de casos EIRELI → SLU (Lei 14.195/2021)
 * 
 * Schedule: 0 9 1 * * (primeiro dia de cada mês às 9h UTC)
 * 
 * Detecta empresas EIRELI e gera ordens de serviço para migração SLU
 */

interface Empresa {
  cnpj: string;
  razao_social: string;
  natureza_juridica?: string;
}

interface ServiceOrder {
  empresa_cnpj: string;
  empresa_nome: string;
  tipo: string;
  descricao: string;
  status: string;
  prioridade: string;
  created_at: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validar segurança
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. Buscar empresas EIRELI
    const { data: eireliCompanies, error: fetchError } = await supabase
      .from('empresas')
      .select('cnpj, razao_social, natureza_juridica')
      .or('razao_social.ilike.%EIRELI%,natureza_juridica.eq.213-5');

    if (fetchError) throw fetchError;

    if (!eireliCompanies || eireliCompanies.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma empresa EIRELI encontrada',
        processed: 0,
      });
    }

    // 2. Verificar quais já têm ordem de serviço
    const { data: existingOrders } = await supabase
      .from('ordens_servico')
      .select('empresa_cnpj')
      .eq('tipo', 'MIGRACAO_SLU')
      .in('status', ['pendente', 'em_andamento']);

    const existingCnpjs = new Set(existingOrders?.map((o) => o.empresa_cnpj) || []);

    // 3. Criar ordens de serviço para empresas sem OS
    const ordersToCreate: ServiceOrder[] = [];

    for (const empresa of eireliCompanies) {
      if (existingCnpjs.has(empresa.cnpj)) continue;

      ordersToCreate.push({
        empresa_cnpj: empresa.cnpj,
        empresa_nome: empresa.razao_social,
        tipo: 'MIGRACAO_SLU',
        descricao: `Migração EIRELI → SLU (Lei 14.195/2021) - ${empresa.razao_social}`,
        status: 'pendente',
        prioridade: 'media',
        created_at: new Date().toISOString(),
      });
    }

    // 4. Inserir ordens de serviço
    let created = 0;
    if (ordersToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('ordens_servico')
        .insert(ordersToCreate);

      if (!insertError) {
        created = ordersToCreate.length;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Processamento 213-5 concluído',
      stats: {
        totalEIRELI: eireliCompanies.length,
        existingOrders: existingCnpjs.size,
        newOrders: created,
      },
    });
  } catch (error) {
    console.error('Erro no cron update-213-5:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
