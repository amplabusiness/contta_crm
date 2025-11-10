#!/usr/bin/env node
/**
 * Script de seed para indicações (programa de indicações)
 * Popula 15-20 indicações com cálculo de recompensas por porte
 * 
 * Uso:
 *   npx tsx scripts/seed-indicacoes.ts
 *   npx tsx scripts/seed-indicacoes.ts --dry-run
 *   npx tsx scripts/seed-indicacoes.ts --reset
 */

import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const isReset = process.argv.includes('--reset');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Distribuição de status de indicações
const STATUS_DISTRIBUTION = [
  { status: 'Convertido', weight: 0.30 },        // 30%
  { status: 'Em negociação', weight: 0.50 },    // 50%
  { status: 'Rejeitado', weight: 0.20 },        // 20%
] as const;

// Programa de recompensas por porte (em R$)
const RECOMPENSA_POR_PORTE: Record<string, { bronze: number; prata: number; ouro: number; platina: number }> = {
  'ME': { bronze: 50, prata: 100, ouro: 200, platina: 500 },
  'EPP': { bronze: 100, prata: 200, ouro: 400, platina: 800 },
  'MEDIA': { bronze: 200, prata: 400, ouro: 800, platina: 1500 },
  'GRANDE': { bronze: 300, prata: 600, ouro: 1200, platina: 2000 },
};

// Naturezas jurídicas que requerem migração para SLU (213-5)
const NATUREZAS_2135 = [
  '213-5', // Empresa Individual de Responsabilidade Limitada (EIRELI)
];

// Templates de empresas para indicação
const EMPRESA_TEMPLATES = [
  { nome: 'Inovação Tech Soluções LTDA', porte: 'ME', natureza: '206-2' },
  { nome: 'Comercial Distribuidora Nacional EIRELI', porte: 'EPP', natureza: '213-5' }, // Requer migração
  { nome: 'Indústria Mecânica Precisão SA', porte: 'MEDIA', natureza: '205-4' },
  { nome: 'Serviços Consultoria Empresarial LTDA', porte: 'ME', natureza: '206-2' },
  { nome: 'Logística Rápida Transportes EIRELI', porte: 'GRANDE', natureza: '213-5' }, // Requer migração
  { nome: 'Farmácia Central Medicamentos LTDA', porte: 'EPP', natureza: '206-2' },
  { nome: 'Construtora Moderna Obras SA', porte: 'MEDIA', natureza: '205-4' },
  { nome: 'Supermercado Família Alimentos LTDA', porte: 'EPP', natureza: '206-2' },
  { nome: 'Clínica Médica Saúde Plena EIRELI', porte: 'ME', natureza: '213-5' }, // Requer migração
  { nome: 'Hotel Executivo Business LTDA', porte: 'MEDIA', natureza: '206-2' },
  { nome: 'Advocacia Jurídica Total SS', porte: 'ME', natureza: '228-3' },
  { nome: 'Imobiliária Prime Negócios EIRELI', porte: 'EPP', natureza: '213-5' }, // Requer migração
  { nome: 'Academia Fitness Pro LTDA', porte: 'ME', natureza: '206-2' },
  { nome: 'Escola Educação Fundamental LTDA', porte: 'EPP', natureza: '206-2' },
  { nome: 'Restaurante Gourmet Sabores SA', porte: 'MEDIA', natureza: '205-4' },
  { nome: 'Laboratório Análises Clínicas EIRELI', porte: 'ME', natureza: '213-5' }, // Requer migração
  { nome: 'Posto Combustíveis Rodoviário LTDA', porte: 'EPP', natureza: '206-2' },
  { nome: 'Corretora Seguros Proteção LTDA', porte: 'ME', natureza: '206-2' },
  { nome: 'Gráfica Digital Impressões SA', porte: 'MEDIA', natureza: '205-4' },
  { nome: 'Auto Peças Mecânica Express LTDA', porte: 'EPP', natureza: '206-2' },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(array: T[]): T => array[randomInt(0, array.length - 1)];

const selectWeighted = <T extends { weight: number }>(items: readonly T[]): Omit<T, 'weight'> => {
  const random = Math.random();
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (random <= cumulative) {
      const { weight, ...rest } = item;
      return rest as Omit<T, 'weight'>;
    }
  }
  const { weight, ...rest } = items[0];
  return rest as Omit<T, 'weight'>;
};

const calcularRecompensa = (porte: string, status: string): number => {
  if (status !== 'Convertido') return 0;

  const recompensas = RECOMPENSA_POR_PORTE[porte] || RECOMPENSA_POR_PORTE['ME'];
  
  // Distribuição de níveis: 50% bronze, 30% prata, 15% ouro, 5% platina
  const random = Math.random();
  if (random < 0.50) return recompensas.bronze;
  if (random < 0.80) return recompensas.prata;
  if (random < 0.95) return recompensas.ouro;
  return recompensas.platina;
};

const generateDataIndicacao = (status: string): string => {
  const today = new Date();
  
  if (status === 'Convertido') {
    // Convertidos: entre -90 e -30 dias
    const daysBack = randomInt(30, 90);
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    return date.toISOString();
  }
  
  if (status === 'Rejeitado') {
    // Rejeitados: entre -60 e -10 dias
    const daysBack = randomInt(10, 60);
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    return date.toISOString();
  }
  
  // Em negociação: entre -30 e -1 dias
  const daysBack = randomInt(1, 30);
  const date = new Date(today);
  date.setDate(date.getDate() - daysBack);
  return date.toISOString();
};

const generateIndicacoes = async (count: number = 18) => {
  console.log(`\n🎲 Gerando ${count} indicações realistas...`);

  // Buscar empresas reais para vincular
  const { data: empresas } = await supabase
    .from('empresas')
    .select('cnpj, razao_social, porte')
    .limit(50);

  // Buscar usuários para indicador
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(10);

  const indicacoes = [];

  for (let i = 0; i < count; i++) {
    const template = randomItem(EMPRESA_TEMPLATES);
    const { status } = selectWeighted(STATUS_DISTRIBUTION);
    
    const porte = template.porte;
    const recompensaGanha = calcularRecompensa(porte, status);
    const dataIndicacao = generateDataIndicacao(status);
    const requiresMigration2135 = NATUREZAS_2135.includes(template.natureza);
    
    // Tentar vincular empresa real se disponível
    const empresa = empresas && empresas.length > i ? empresas[i] : null;
    const empresaNome = empresa?.razao_social || template.nome;
    const empresaCnpj = empresa?.cnpj || null;
    
    const indicadorId = users && users.length > 0 ? randomItem(users).id : null;

    indicacoes.push({
      empresa_nome: empresaNome,
      empresa_cnpj: empresaCnpj,
      status,
      data_indicacao: dataIndicacao,
      recompensa_ganha: recompensaGanha,
      indicador_id: indicadorId,
    });
  }

  return indicacoes;
};

const main = async () => {
  console.log('🤝 Seed de Indicações - Contta CRM');
  console.log(`   Modo: ${isDryRun ? 'DRY RUN (simulação)' : 'PRODUÇÃO'}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);

  if (isReset) {
    console.log('\n🗑️  Removendo indicações existentes...');
    if (!isDryRun) {
      const { error } = await supabase.from('indicacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw new Error(`Falha ao limpar indicações: ${error.message}`);
      console.log('   ✅ Indicações removidas');
    } else {
      console.log('   [dry-run] Removeria todas as indicações');
    }
    return;
  }

  const indicacoes = await generateIndicacoes(18);

  console.log('\n📊 Distribuição de Status:');
  const statusDist = indicacoes.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(statusDist).forEach(([status, count]) => {
    const percentage = Math.round((Number(count) / indicacoes.length) * 100);
    console.log(`   ${status}: ${count} (${percentage}%)`);
  });

  console.log('\n💰 Estatísticas de Recompensas:');
  const totalRecompensas = indicacoes.reduce((sum, i) => sum + i.recompensa_ganha, 0);
  const convertidas = indicacoes.filter(i => i.status === 'Convertido');
  const avgRecompensa = convertidas.length > 0
    ? totalRecompensas / convertidas.length
    : 0;

  console.log(`   Total pago: R$ ${totalRecompensas.toLocaleString('pt-BR')}`);
  console.log(`   Convertidas: ${convertidas.length}`);
  console.log(`   Média por conversão: R$ ${Math.round(avgRecompensa).toLocaleString('pt-BR')}`);

  console.log('\n⚠️  Migração 213-5 (EIRELI → SLU):');
  const requiresMigration = indicacoes.filter(i => i.requires_migration_2135);
  console.log(`   Empresas que requerem migração: ${requiresMigration.length}`);
  if (requiresMigration.length > 0) {
    console.log('   Empresas:');
    requiresMigration.slice(0, 3).forEach(i => {
      console.log(`     - ${i.empresa_nome} (${i.status})`);
    });
    if (requiresMigration.length > 3) {
      console.log(`     ... e mais ${requiresMigration.length - 3}`);
    }
  }

  if (!isDryRun) {
    console.log('\n💾 Inserindo indicações no Supabase...');
    const { data, error } = await supabase
      .from('indicacoes')
      .insert(indicacoes)
      .select('id, empresa_nome, status, recompensa_ganha');

    if (error) {
      throw new Error(`Falha ao inserir indicações: ${error.message}`);
    }

    console.log(`   ✅ ${data?.length || 0} indicações inseridas com sucesso`);
    
    console.log('\n📋 Primeiras 5 indicações criadas:');
    data?.slice(0, 5).forEach(i => {
      const recompensaStr = i.recompensa_ganha > 0 
        ? `R$ ${i.recompensa_ganha.toLocaleString('pt-BR')}`
        : 'R$ 0';
      console.log(`   - ${i.empresa_nome} | ${i.status} | ${recompensaStr}`);
    });
  } else {
    console.log('\n[dry-run] Seriam inseridas as seguintes indicações:');
    indicacoes.slice(0, 5).forEach(i => {
      const recompensaStr = i.recompensa_ganha > 0 
        ? `R$ ${i.recompensa_ganha.toLocaleString('pt-BR')}`
        : 'R$ 0';
      console.log(`   - ${i.empresa_nome} | ${i.status} | ${recompensaStr}`);
    });
    console.log(`   ... e mais ${indicacoes.length - 5} indicações`);
  }

  console.log('\n✅ Seed de indicações concluído!');
  console.log('\n💡 Próximos passos:');
  console.log('   1. Valide: npm run dev e navegue para /indicacoes');
  console.log('   2. Configure automação de OS para empresas 213-5');
  console.log('   3. Execute audit-data-integrity.ts para validar vínculos');
};

main()
  .catch((error) => {
    console.error('\n❌ Erro ao executar seed:', error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
