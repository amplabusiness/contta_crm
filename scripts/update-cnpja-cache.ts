#!/usr/bin/env tsx
/**
 * Script de Atualização Diária do Cache CNPJá
 * 
 * Objetivo: Consultar empresas no Supabase com dados desatualizados (> 90 dias)
 * e atualizar via CNPJá API, respeitando rate limiting.
 * 
 * Uso:
 *   npx tsx scripts/update-cnpja-cache.ts
 * 
 * Ambiente:
 *   - SUPABASE_URL e SUPABASE_SERVICE_KEY (acesso ao banco)
 *   - CNPJA_API_KEY (opcional, para aumentar rate limit)
 * 
 * @author Contta CRM Team
 * @date 2025-11-10
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const DAYS_THRESHOLD = 90;
const RATE_LIMIT_MS = 3000; // 3 segundos entre requests (20 req/min)
const BATCH_SIZE = 50; // Processar 50 empresas por execução

interface EmpresaDB {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  data_ultima_atualizacao: string | null;
  created_at: string;
}

interface CNPJaResponse {
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_abertura: string;
  porte: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  cnae_fiscal: string;
  cnae_fiscal_descricao: string;
  email: string;
  telefone: string;
}

/**
 * Busca empresas desatualizadas no Supabase
 */
async function fetchStaleCompanies(): Promise<EmpresaDB[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_THRESHOLD);

  console.log(`🔍 Buscando empresas desatualizadas desde ${cutoffDate.toISOString().split('T')[0]}...`);

  const { data, error } = await supabase
    .from('empresas')
    .select('cnpj, razao_social, nome_fantasia, data_ultima_atualizacao, created_at')
    .or(`data_ultima_atualizacao.is.null,data_ultima_atualizacao.lt.${cutoffDate.toISOString()}`)
    .order('data_ultima_atualizacao', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('❌ Erro ao buscar empresas:', error.message);
    throw error;
  }

  console.log(`✅ Encontradas ${data.length} empresas para atualizar`);
  return data as EmpresaDB[];
}

/**
 * Consulta CNPJá API para obter dados atualizados
 */
async function fetchFromCNPJa(cnpj: string): Promise<CNPJaResponse | null> {
  const sanitizedCnpj = cnpj.replace(/[^\d]/g, '');
  const apiKey = process.env.CNPJA_API_KEY;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiKey) {
    headers['Authorization'] = apiKey;
  }

  try {
    const response = await fetch(`https://api.cnpja.com/office/${sanitizedCnpj}`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`⚠️ Rate limit atingido para CNPJ ${cnpj}`);
        return null;
      }
      console.error(`❌ Erro ao consultar CNPJ ${cnpj}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as CNPJaResponse;
  } catch (error) {
    console.error(`❌ Exceção ao consultar CNPJ ${cnpj}:`, error);
    return null;
  }
}

/**
 * Atualiza empresa no Supabase com dados do CNPJá
 */
async function updateCompany(cnpj: string, cnpjaData: CNPJaResponse): Promise<boolean> {
  const payload = {
    razao_social: cnpjaData.razao_social,
    nome_fantasia: cnpjaData.nome_fantasia || cnpjaData.razao_social,
    situacao_cadastral: cnpjaData.situacao_cadastral,
    data_abertura: cnpjaData.data_abertura,
    porte: cnpjaData.porte,
    logradouro: cnpjaData.logradouro,
    numero: cnpjaData.numero,
    bairro: cnpjaData.bairro,
    cidade: cnpjaData.municipio,
    uf: cnpjaData.uf,
    cep: cnpjaData.cep,
    cnae_principal_codigo: cnpjaData.cnae_fiscal,
    cnae_principal_descricao: cnpjaData.cnae_fiscal_descricao,
    emails: cnpjaData.email ? [cnpjaData.email] : [],
    telefones: cnpjaData.telefone ? [cnpjaData.telefone] : [],
    data_ultima_atualizacao: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('empresas')
    .update(payload)
    .eq('cnpj', cnpj);

  if (error) {
    console.error(`❌ Erro ao atualizar empresa ${cnpj}:`, error.message);
    return false;
  }

  return true;
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando atualização do cache CNPJá...\n');

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    const companies = await fetchStaleCompanies();

    if (companies.length === 0) {
      console.log('✅ Nenhuma empresa precisa ser atualizada!');
      return;
    }

    console.log(`\n📊 Processando ${companies.length} empresas...\n`);

    for (const company of companies) {
      console.log(`🔄 Atualizando ${company.cnpj} - ${company.razao_social}...`);

      const cnpjaData = await fetchFromCNPJa(company.cnpj);

      if (!cnpjaData) {
        errorCount++;
        console.log(`   ⏭️ Pulando (erro na API)`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
        continue;
      }

      const updated = await updateCompany(company.cnpj, cnpjaData);

      if (updated) {
        successCount++;
        console.log(`   ✅ Atualizado com sucesso`);
      } else {
        errorCount++;
        console.log(`   ❌ Falha ao atualizar no Supabase`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA ATUALIZAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Atualizadas: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`⏱️ Tempo total: ${duration}s`);
    console.log(`📈 Taxa de sucesso: ${((successCount / companies.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro fatal durante execução:', error);
    process.exit(1);
  }
}

// Executar
main();
