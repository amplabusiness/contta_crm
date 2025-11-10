#!/usr/bin/env tsx
/**
 * Auditoria da base de genealogia empresarial.
 *
 * Relatório rápido usando Supabase:
 * - Totais de empresas, sócios e vínculos
 * - Empresas sem quadro cadastrado
 * - Sócios com maior número de participações
 */

import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local antes de rodar este script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface EmpresaRow {
  cnpj: string;
  razao_social: string | null;
}

interface SocioRow {
  cpf_parcial: string;
  nome_socio: string | null;
}

interface RelacaoRow {
  empresa_cnpj: string;
  socio_cpf_parcial: string;
  qualificacao: string | null;
  percentual_capital: number | null;
}

async function fetchAllRelacoes(): Promise<RelacaoRow[]> {
  const pageSize = 1000;
  let from = 0;
  const result: RelacaoRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('empresa_socios')
      .select('empresa_cnpj, socio_cpf_parcial, qualificacao, percentual_capital')
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    result.push(...(data as RelacaoRow[]));

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return result;
}

async function fetchAllSocios(): Promise<SocioRow[]> {
  const pageSize = 1000;
  let from = 0;
  const result: SocioRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('socios')
      .select('cpf_parcial, nome_socio')
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    result.push(...(data as SocioRow[]));

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return result;
}

async function fetchAllEmpresas(): Promise<EmpresaRow[]> {
  const pageSize = 1000;
  let from = 0;
  const result: EmpresaRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('empresas')
      .select('cnpj, razao_social')
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    result.push(...(data as EmpresaRow[]));

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return result;
}

function formatNumber(num: number) {
  return num.toLocaleString('pt-BR');
}

(async function main() {
  console.log('🧾 Iniciando auditoria de genealogia empresarial...');

  const [empresas, socios, relacoes] = await Promise.all([
    fetchAllEmpresas(),
    fetchAllSocios(),
    fetchAllRelacoes(),
  ]);

  const relacoesPorEmpresa = new Map<string, RelacaoRow[]>();
  const relacoesPorSocio = new Map<string, RelacaoRow[]>();

  relacoes.forEach((rel) => {
    if (!rel.empresa_cnpj || !rel.socio_cpf_parcial) {
      return;
    }

    if (!relacoesPorEmpresa.has(rel.empresa_cnpj)) {
      relacoesPorEmpresa.set(rel.empresa_cnpj, []);
    }
    relacoesPorEmpresa.get(rel.empresa_cnpj)!.push(rel);

    if (!relacoesPorSocio.has(rel.socio_cpf_parcial)) {
      relacoesPorSocio.set(rel.socio_cpf_parcial, []);
    }
    relacoesPorSocio.get(rel.socio_cpf_parcial)!.push(rel);
  });

  const empresasComSocios = relacoesPorEmpresa.size;
  const sociosComMaisDeUmaEmpresa = Array.from(relacoesPorSocio.entries()).filter(([, lista]) => {
    const empresasUnicas = new Set(lista.map((rel) => rel.empresa_cnpj));
    return empresasUnicas.size > 1;
  }).length;

  const empresasSemSocios = empresas.filter((empresa) => !relacoesPorEmpresa.has(empresa.cnpj));

  const topEmpresas = Array.from(relacoesPorEmpresa.entries())
    .map(([cnpj, lista]) => ({
      cnpj,
      totalSocios: lista.length,
      qualificacoes: lista.map((rel) => rel.qualificacao).filter(Boolean) as string[],
    }))
    .sort((a, b) => b.totalSocios - a.totalSocios)
    .slice(0, 10);

  const sociosNomeMap = new Map(socios.map((s) => [s.cpf_parcial, s.nome_socio]));

  const topSocios = Array.from(relacoesPorSocio.entries())
    .map(([cpf, lista]) => ({
      cpf,
      nome: sociosNomeMap.get(cpf) || 'Sócio sem nome cadastrado',
      empresas: Array.from(new Set(lista.map((rel) => rel.empresa_cnpj))).length,
    }))
    .sort((a, b) => b.empresas - a.empresas)
    .slice(0, 10);

  console.log('\n=== TOTAL GERAL ===');
  console.log(`• Empresas cadastradas: ${formatNumber(empresas.length)}`);
  console.log(`• Sócios únicos: ${formatNumber(socios.length)}`);
  console.log(`• Relações empresa-sócio registradas: ${formatNumber(relacoes.length)}`);
  console.log(`• Empresas com quadro societário: ${formatNumber(empresasComSocios)} (${((empresasComSocios / (empresas.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`• Sócios com presença em mais de uma empresa: ${formatNumber(sociosComMaisDeUmaEmpresa)}`);

  if (empresasSemSocios.length > 0) {
    console.log('\n=== EMPRESAS SEM QUADRO SOCIETÁRIO CADASTRADO ===');
    empresasSemSocios.slice(0, 10).forEach((empresa) => {
      console.log(`• ${empresa.cnpj} — ${empresa.razao_social ?? 'Razão não informada'}`);
    });
    if (empresasSemSocios.length > 10) {
      console.log(`  ... +${empresasSemSocios.length - 10} empresas sem sócios`);
    }
  } else {
    console.log('\nTodas as empresas possuem sócios cadastrados.');
  }

  console.log('\n=== TOP 10 EMPRESAS POR NÚMERO DE SÓCIOS ===');
  topEmpresas.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.cnpj} — ${item.totalSocios} sócios (qualificações: ${item.qualificacoes.slice(0, 5).join(', ') || 'não informadas'})`
    );
  });

  console.log('\n=== TOP 10 SÓCIOS POR QUANTIDADE DE EMPRESAS ===');
  topSocios.forEach((item, index) => {
    console.log(`${index + 1}. ${mascaraCpf(item.cpf)} — ${item.nome} (${item.empresas} empresas)`);
  });

  console.log('\n✅ Auditoria concluída.');
})().catch((error) => {
  console.error('❌ Erro durante a auditoria:', error);
  process.exit(1);
});

function mascaraCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, '').padStart(11, '0');
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}
