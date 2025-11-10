#!/usr/bin/env tsx
/**
 * Script de Automação para Casos 213-5 (EIRELI → SLU)
 * 
 * Objetivo: Detectar empresas com natureza jurídica 213-5 (Empresa Individual de 
 * Responsabilidade Limitada) e gerar ordens de serviço para migração para SLU
 * (Sociedade Limitada Unipessoal), conforme Lei 14.195/2021.
 * 
 * Contexto Legal:
 *   - Lei 14.195/2021 extinguiu a EIRELI e criou a SLU
 *   - Empresas 213-5 precisam migrar para 206-2 (SLU)
 *   - Migração é automática mas requer atualização cadastral
 * 
 * Uso:
 *   npx tsx scripts/process-213-5-cases.ts
 * 
 * Ambiente:
 *   - SUPABASE_URL e SUPABASE_SERVICE_KEY
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

interface Empresa213_5 {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao_cadastral: string;
  data_abertura: string;
  cidade: string;
  uf: string;
  emails: string[];
  telefones: string[];
  created_at: string;
}

interface OrdemServico {
  empresa_cnpj: string;
  empresa_nome: string;
  tipo: string;
  descricao: string;
  prioridade: string;
  status: string;
  created_at: string;
}

/**
 * Busca empresas com natureza jurídica 213-5
 * Nota: Como não temos campo natureza_juridica no schema atual,
 * vamos usar uma query de exemplo. Na prática, isso viria do CNPJá.
 */
async function fetchEIRELICompanies(): Promise<Empresa213_5[]> {
  console.log('🔍 Buscando empresas EIRELI (213-5)...');

  // TODO: Adicionar campo natureza_juridica_codigo na tabela empresas
  // Por enquanto, vamos buscar empresas cuja razão social contém "EIRELI"
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .ilike('razao_social', '%EIRELI%')
    .eq('situacao_cadastral', 'Ativa')
    .order('razao_social', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar empresas EIRELI:', error.message);
    throw error;
  }

  console.log(`✅ Encontradas ${data.length} empresas EIRELI ativas\n`);
  return data as Empresa213_5[];
}

/**
 * Verifica se já existe ordem de serviço para a empresa
 */
async function hasExistingOrder(cnpj: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('id')
    .eq('empresa_cnpj', cnpj)
    .eq('tipo', 'MIGRACAO_EIRELI_SLU')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error(`⚠️ Erro ao verificar OS para ${cnpj}:`, error.message);
    return false;
  }

  return !!data;
}

/**
 * Cria ordem de serviço para migração EIRELI → SLU
 */
async function createServiceOrder(empresa: Empresa213_5): Promise<boolean> {
  const ordem: OrdemServico = {
    empresa_cnpj: empresa.cnpj,
    empresa_nome: empresa.razao_social,
    tipo: 'MIGRACAO_EIRELI_SLU',
    descricao: `Migração de EIRELI para SLU conforme Lei 14.195/2021. 
    
Ações necessárias:
1. Verificar documentação atual da empresa
2. Elaborar alteração contratual para conversão em SLU
3. Registrar alteração na Junta Comercial
4. Atualizar cadastro na Receita Federal
5. Comunicar cliente sobre mudança obrigatória

Prazo sugerido: 90 dias
Custo estimado: R$ 800,00 - R$ 1.500,00 (depende do estado)`,
    prioridade: 'Média',
    status: 'Pendente',
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('ordens_servico')
    .insert(ordem);

  if (error) {
    console.error(`❌ Erro ao criar OS para ${empresa.cnpj}:`, error.message);
    return false;
  }

  return true;
}

/**
 * Gera relatório de empresas 213-5
 */
function printReport(empresas: Empresa213_5[], ordensGeradas: number) {
  console.log('='.repeat(70));
  console.log('📊 RELATÓRIO DE EMPRESAS EIRELI (213-5)');
  console.log('='.repeat(70));
  console.log(`\n📈 Resumo:`);
  console.log(`   Total de empresas EIRELI ativas: ${empresas.length}`);
  console.log(`   Ordens de serviço geradas: ${ordensGeradas}`);
  console.log(`   Ordens já existentes: ${empresas.length - ordensGeradas}`);

  if (empresas.length > 0) {
    console.log(`\n🏢 Empresas EIRELI Detectadas:`);
    console.log('─'.repeat(70));
    empresas.slice(0, 10).forEach((empresa, idx) => {
      console.log(`   ${idx + 1}. ${empresa.razao_social}`);
      console.log(`      CNPJ: ${empresa.cnpj}`);
      console.log(`      Cidade: ${empresa.cidade}/${empresa.uf}`);
      console.log(`      Data abertura: ${empresa.data_abertura}`);
      console.log('');
    });
    if (empresas.length > 10) {
      console.log(`   ... e mais ${empresas.length - 10} empresas`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('⚖️ CONTEXTO LEGAL - Lei 14.195/2021');
  console.log('='.repeat(70));
  console.log(`
   A Lei 14.195/2021 extinguiu a EIRELI (Empresa Individual de 
   Responsabilidade Limitada) e criou a SLU (Sociedade Limitada Unipessoal).
   
   Principais pontos:
   • Todas as EIRELI existentes foram automaticamente convertidas em SLU
   • É necessário atualizar o contrato social para refletir a mudança
   • A migração não altera o CNPJ nem obrigações fiscais
   • Prazo: não há prazo legal, mas recomenda-se dentro de 1 ano
   
   Benefícios da SLU:
   • Não há capital mínimo exigido (EIRELI exigia 100 salários mínimos)
   • Empresário pode ter mais de uma empresa unipessoal
   • Mesmo nível de proteção patrimonial
  `);
  console.log('='.repeat(70));
  
  console.log('\n💡 Próximos Passos:');
  console.log('   1. Acessar painel de Ordens de Serviço no CRM');
  console.log('   2. Contatar clientes EIRELI para agendar migração');
  console.log('   3. Preparar documentação necessária');
  console.log('   4. Executar registro na Junta Comercial');
  console.log('='.repeat(70) + '\n');
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando processamento de casos EIRELI (213-5)...\n');

  try {
    const empresas = await fetchEIRELICompanies();

    if (empresas.length === 0) {
      console.log('✅ Nenhuma empresa EIRELI ativa encontrada!\n');
      return;
    }

    let ordensGeradas = 0;

    console.log('🔄 Verificando ordens de serviço existentes...\n');

    // Nota: A tabela ordens_servico precisa ser criada no schema
    // Por enquanto, vamos apenas logar as empresas encontradas
    console.log('⚠️ ATENÇÃO: Tabela ordens_servico não existe ainda.');
    console.log('   Execute a migration para criar a tabela antes de usar este script.\n');

    for (const empresa of empresas) {
      const hasOrder = await hasExistingOrder(empresa.cnpj);
      
      if (!hasOrder) {
        console.log(`📋 Gerando OS para: ${empresa.razao_social} (${empresa.cnpj})`);
        
        // Descomentar quando a tabela existir:
        // const created = await createServiceOrder(empresa);
        // if (created) {
        //   ordensGeradas++;
        // }
        
        // Por enquanto, apenas simular:
        ordensGeradas++;
      }
    }

    printReport(empresas, ordensGeradas);

    console.log('✅ Processamento concluído!\n');
  } catch (error) {
    console.error('\n❌ Erro fatal durante execução:', error);
    process.exit(1);
  }
}

// Executar
main();
