#!/usr/bin/env node
/**
 * Script de seed para deals (negócios) realistas
 * Popula 20-30 negócios com variação de estágios, valores e datas
 * 
 * Uso:
 *   npx tsx scripts/seed-deals.ts
 *   npx tsx scripts/seed-deals.ts --dry-run
 *   npx tsx scripts/seed-deals.ts --reset
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
  console.error('   Configure em .env.local: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const isReset = process.argv.includes('--reset');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Tipos de estágios com distribuição realista
const STAGES = [
  { stage: 'Prospecting', weight: 0.25 },      // 25%
  { stage: 'Qualification', weight: 0.20 },    // 20%
  { stage: 'Proposal', weight: 0.20 },         // 20%
  { stage: 'Negotiation', weight: 0.15 },      // 15%
  { stage: 'Closed Won', weight: 0.10 },       // 10%
  { stage: 'Closed Lost', weight: 0.10 },      // 10%
] as const;

// Templates de empresas realistas
const COMPANY_TEMPLATES = [
  { name: 'Tech Innovators LTDA', cnae: '6201-5/00', porte: 'EPP', value: [8000, 15000] },
  { name: 'Comércio Atacadista São Paulo LTDA', cnae: '4644-3/01', porte: 'MEDIA', value: [5000, 12000] },
  { name: 'Indústria Metalúrgica Moderna ME', cnae: '2511-0/00', porte: 'ME', value: [3000, 8000] },
  { name: 'Prestadora de Serviços Contábeis LTDA', cnae: '6920-6/01', porte: 'EPP', value: [4000, 10000] },
  { name: 'Logística Expressa Transportes SA', cnae: '4930-2/02', porte: 'GRANDE', value: [10000, 20000] },
  { name: 'Construtora Moderna Empreendimentos LTDA', cnae: '4120-4/00', porte: 'MEDIA', value: [7000, 15000] },
  { name: 'Restaurante Sabor Brasileiro LTDA', cnae: '5611-2/01', porte: 'ME', value: [2000, 5000] },
  { name: 'Clínica Médica Saúde Total LTDA', cnae: '8610-1/01', porte: 'EPP', value: [5000, 10000] },
  { name: 'Academia Fitness Plus LTDA', cnae: '9313-1/00', porte: 'ME', value: [1500, 4000] },
  { name: 'Escola Educação Infantil Criança Feliz LTDA', cnae: '8511-2/00', porte: 'ME', value: [2500, 6000] },
  { name: 'Farmácia Popular Medicamentos LTDA', cnae: '4771-7/01', porte: 'EPP', value: [3500, 8000] },
  { name: 'Agência de Marketing Digital Conecta LTDA', cnae: '7311-4/00', porte: 'ME', value: [4000, 9000] },
  { name: 'Consultoria Empresarial Estratégica SA', cnae: '7020-4/00', porte: 'MEDIA', value: [8000, 16000] },
  { name: 'Distribuidora de Bebidas Líder LTDA', cnae: '4635-4/99', porte: 'GRANDE', value: [9000, 18000] },
  { name: 'Posto de Combustíveis Rodoviário LTDA', cnae: '4731-8/00', porte: 'EPP', value: [6000, 12000] },
  { name: 'Seguradora Confiança Proteção SA', cnae: '6512-9/00', porte: 'GRANDE', value: [12000, 25000] },
  { name: 'Advocacia Silva & Associados', cnae: '6911-7/01', porte: 'EPP', value: [4500, 9500] },
  { name: 'Gráfica Rápida Impressões LTDA', cnae: '1813-0/01', porte: 'ME', value: [2500, 6000] },
  { name: 'Hotel Executivo Centro LTDA', cnae: '5510-8/01', porte: 'MEDIA', value: [7000, 14000] },
  { name: 'Supermercado Bairro Família LTDA', cnae: '4711-3/02', porte: 'EPP', value: [5500, 11000] },
  { name: 'Padaria Artesanal Pão Quente ME', cnae: '1091-1/02', porte: 'ME', value: [1500, 3500] },
  { name: 'Laboratório de Análises Clínicas Precisão LTDA', cnae: '8640-2/02', porte: 'EPP', value: [4500, 9000] },
  { name: 'Imobiliária Prime Negócios LTDA', cnae: '6821-8/01', porte: 'ME', value: [3000, 7000] },
  { name: 'Auto Peças Mecânica Veloz LTDA', cnae: '4530-7/03', porte: 'ME', value: [2000, 5500] },
  { name: 'Corretora de Seguros Proteção Total LTDA', cnae: '6622-3/00', porte: 'EPP', value: [4000, 8500] },
];

// Nomes de contatos realistas
const CONTACT_NAMES = [
  'João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Almeida',
  'Fernanda Lima', 'Ricardo Pereira', 'Juliana Souza', 'Marcos Rocha', 'Camila Martins',
  'Lucas Fernandes', 'Beatriz Alves', 'André Barbosa', 'Patricia Gomes', 'Felipe Carvalho',
  'Renata Ribeiro', 'Gustavo Monteiro', 'Daniela Castro', 'Rafael Dias', 'Claudia Moreira',
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
const randomItem = <T>(array: T[]): T => array[randomInt(0, array.length - 1)];
const randomDate = (daysBack: number, daysForward: number) => {
  const today = new Date();
  const offset = randomInt(-daysBack, daysForward);
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  return date.toISOString().split('T')[0];
};

// Seleciona estágio baseado em distribuição ponderada
const selectStage = (): string => {
  const random = Math.random();
  let cumulative = 0;
  for (const { stage, weight } of STAGES) {
    cumulative += weight;
    if (random <= cumulative) return stage;
  }
  return 'Prospecting';
};

// Gera health score realista baseado no estágio
const generateHealthData = (stage: string) => {
  const healthMap: Record<string, { min: number; max: number }> = {
    'Prospecting': { min: 40, max: 60 },
    'Qualification': { min: 55, max: 75 },
    'Proposal': { min: 65, max: 85 },
    'Negotiation': { min: 70, max: 90 },
    'Closed Won': { min: 90, max: 100 },
    'Closed Lost': { min: 10, max: 30 },
  };

  const range = healthMap[stage] || { min: 50, max: 70 };
  const score = randomInt(range.min, range.max);

  const reasonings = {
    high: [
      'Cliente demonstrou forte interesse e budget confirmado',
      'Múltiplas interações positivas com decisores',
      'Proposta alinhada com necessidades críticas do cliente',
      'Referência positiva de parceiro comercial',
    ],
    medium: [
      'Cliente avaliando alternativas no mercado',
      'Orçamento aprovado mas decisão pendente',
      'Necessita de ajustes na proposta comercial',
      'Aguardando alinhamento interno do cliente',
    ],
    low: [
      'Sem retorno há mais de 15 dias',
      'Cliente sinalizou restrições orçamentárias',
      'Concorrente apresentou proposta mais agressiva',
      'Mudança de prioridades do cliente',
    ],
  };

  const actions = {
    high: [
      'Agendar reunião de fechamento nos próximos 5 dias',
      'Enviar contrato para assinatura',
      'Preparar onboarding do cliente',
      'Confirmar datas de implementação',
    ],
    medium: [
      'Follow-up semanal para manter engajamento',
      'Apresentar case de sucesso similar',
      'Revisar proposta com ajustes solicitados',
      'Agendar demo técnica com equipe do cliente',
    ],
    low: [
      'Contato urgente para reengajar',
      'Oferecer desconto ou condições especiais',
      'Identificar bloqueadores e traçar plano de ação',
      'Marcar reunião presencial com decisor',
    ],
  };

  const level = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';

  return {
    score,
    reasoning: randomItem(reasonings[level]),
    action: randomItem(actions[level]),
  };
};

const generateDeals = async (count: number = 25) => {
  console.log(`\n🎲 Gerando ${count} deals realistas...`);

  // Buscar empresas reais do Supabase para vincular
  const { data: empresas } = await supabase
    .from('empresas')
    .select('cnpj, razao_social, porte')
    .limit(100);

  // Buscar usuários para atribuir deals
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('role', 'Admin')
    .limit(5);

  const ownerId = users && users.length > 0 ? users[0].id : null;

  const deals = [];

  for (let i = 0; i < count; i++) {
    const template = randomItem(COMPANY_TEMPLATES);
    const stage = selectStage();
    const value = randomFloat(template.value[0], template.value[1]);
    const health = generateHealthData(stage);
    
    // Tentar vincular a empresa real se disponível
    const empresa = empresas && empresas.length > i ? empresas[i] : null;
    const companyName = empresa?.razao_social || `${template.name} #${i + 1}`;
    const empresaCnpj = empresa?.cnpj || null;

    const contactName = randomItem(CONTACT_NAMES);
    const contactEmail = `${contactName.toLowerCase().replace(' ', '.')}@${companyName.toLowerCase().replace(/\s+/g, '').substring(0, 15)}.com.br`;

    const probability = stage === 'Closed Won' ? 100
      : stage === 'Closed Lost' ? 0
      : randomInt(30, 90);

    const expectedCloseDate = stage.startsWith('Closed') 
      ? randomDate(60, 0) // Fechados no passado
      : randomDate(0, 90); // Abertos no futuro

    const lastActivity = stage.startsWith('Closed')
      ? randomDate(60, 0)
      : randomDate(15, 0);

    deals.push({
      company_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      value: Math.round(value),
      probability,
      stage,
      expected_close_date: expectedCloseDate,
      last_activity: new Date(lastActivity).toISOString(),
      empresa_cnpj: empresaCnpj,
      owner_id: ownerId,
      health_score: health.score,
      health_reasoning: health.reasoning,
      health_suggested_action: health.action,
    });
  }

  return deals;
};

const main = async () => {
  console.log('💼 Seed de Deals - Contta CRM');
  console.log(`   Modo: ${isDryRun ? 'DRY RUN (simulação)' : 'PRODUÇÃO'}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);

  if (isReset) {
    console.log('\n🗑️  Removendo deals existentes...');
    if (!isDryRun) {
      const { error } = await supabase.from('deals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw new Error(`Falha ao limpar deals: ${error.message}`);
      console.log('   ✅ Deals removidos');
    } else {
      console.log('   [dry-run] Removeria todos os deals');
    }
    return;
  }

  const deals = await generateDeals(25);

  console.log('\n📊 Distribuição de Estágios:');
  const distribution = deals.reduce((acc, d) => {
    acc[d.stage] = (acc[d.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(distribution).forEach(([stage, count]) => {
    console.log(`   ${stage}: ${count} (${Math.round((Number(count) / deals.length) * 100)}%)`);
  });

  console.log('\n💰 Estatísticas de Valor:');
  const values = deals.map(d => d.value);
  const totalValue = values.reduce((sum, v) => sum + v, 0);
  const avgValue = totalValue / values.length;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  console.log(`   Total: R$ ${totalValue.toLocaleString('pt-BR')}`);
  console.log(`   Média: R$ ${Math.round(avgValue).toLocaleString('pt-BR')}`);
  console.log(`   Min: R$ ${minValue.toLocaleString('pt-BR')}`);
  console.log(`   Max: R$ ${maxValue.toLocaleString('pt-BR')}`);

  if (!isDryRun) {
    console.log('\n💾 Inserindo deals no Supabase...');
    const { data, error } = await supabase.from('deals').insert(deals).select('id, company_name, stage, value');

    if (error) {
      throw new Error(`Falha ao inserir deals: ${error.message}`);
    }

    console.log(`   ✅ ${data?.length || 0} deals inseridos com sucesso`);
    
    // Exibir primeiros 5
    console.log('\n📋 Primeiros 5 deals criados:');
    data?.slice(0, 5).forEach(d => {
      console.log(`   - ${d.company_name} | ${d.stage} | R$ ${d.value.toLocaleString('pt-BR')}`);
    });
  } else {
    console.log('\n[dry-run] Seriam inseridos os seguintes deals:');
    deals.slice(0, 5).forEach(d => {
      console.log(`   - ${d.company_name} | ${d.stage} | R$ ${d.value.toLocaleString('pt-BR')}`);
    });
    console.log(`   ... e mais ${deals.length - 5} deals`);
  }

  console.log('\n✅ Seed de deals concluído!');
  console.log('\n💡 Próximos passos:');
  console.log('   1. Execute: npx tsx scripts/seed-tasks.ts');
  console.log('   2. Execute: npx tsx scripts/seed-indicacoes.ts');
  console.log('   3. Valide: npm run dev e navegue para /negocios');
};

main()
  .catch((error) => {
    console.error('\n❌ Erro ao executar seed:', error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
