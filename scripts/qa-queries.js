import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local antes de rodar este script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const printDivider = (title) => {
  console.log('\n' + '─'.repeat(48));
  console.log(title);
  console.log('─'.repeat(48));
};

const ensureNoOverlap = (first, second, key) => {
  const firstSet = new Set(first.map((item) => item[key]));
  const duplicates = second.filter((item) => firstSet.has(item[key]));
  if (duplicates.length > 0) {
    throw new Error(`Itens duplicados encontrados entre páginas (${key}): ${duplicates.map((d) => d[key]).join(', ')}`);
  }
};

async function checkEmpresasPagination() {
  printDivider('Empresas - Paginação e Ordenação');
  const pageSize = 10;

  const { data: page1, error: errorPage1 } = await supabase
    .from('empresas')
    .select('cnpj, razao_social')
    .order('razao_social', { ascending: true, nullsFirst: false })
    .range(0, pageSize - 1);

  if (errorPage1) {
    throw new Error(`Falha ao carregar primeira página: ${errorPage1.message}`);
  }

  const { data: page2, error: errorPage2 } = await supabase
    .from('empresas')
    .select('cnpj, razao_social')
    .order('razao_social', { ascending: true, nullsFirst: false })
    .range(pageSize, pageSize * 2 - 1);

  if (errorPage2) {
    throw new Error(`Falha ao carregar segunda página: ${errorPage2.message}`);
  }

  ensureNoOverlap(page1 ?? [], page2 ?? [], 'cnpj');

  if (page1 && page1.length > 1) {
    const list = [...page1];
    const sorted = [...page1].sort((a, b) => a.razao_social.localeCompare(b.razao_social));
    const sortedMismatch = list.findIndex((item, index) => item.cnpj !== sorted[index].cnpj);
    if (sortedMismatch !== -1) {
      throw new Error('Ordem da primeira página não está consistente (razao_social).');
    }
  }

  console.log(`✅ Paginação OK (${page1?.length ?? 0} + ${page2?.length ?? 0} registros, ordenação estável)`);

  const termoBusca = page1?.[0]?.razao_social?.split(' ')?.[0];
  if (termoBusca) {
    const { data: filtrado, error } = await supabase
      .from('empresas')
      .select('cnpj, razao_social')
      .or(`razao_social.ilike.%${termoBusca}%,nome_fantasia.ilike.%${termoBusca}%`)
      .order('razao_social', { ascending: true })
      .limit(5);

    if (error) {
      throw new Error(`Filtro por termo falhou: ${error.message}`);
    }

    console.log(`🔎 Filtro por termo '${termoBusca}' retornou ${filtrado?.length ?? 0} registros.`);
  }
}

async function checkDealsOrdering() {
  printDivider('Negócios - Ordenação e Limites');
  const { data, error, count } = await supabase
    .from('deals')
    .select('id, company_name, stage, last_activity', { count: 'exact' })
    .order('last_activity', { ascending: false, nullsFirst: false })
    .limit(15);

  if (error) {
    throw new Error(`Falha ao consultar negócios: ${error.message}`);
  }

  console.log(`✅ ${data?.length ?? 0} negócios carregados (total ${count ?? 'desconhecido'})`);

  if (data && data.length > 1) {
    for (let i = 1; i < data.length; i += 1) {
      const anterior = new Date(data[i - 1].last_activity ?? 0).getTime();
      const atual = new Date(data[i].last_activity ?? 0).getTime();
      if (Number.isFinite(anterior) && Number.isFinite(atual) && atual > anterior) {
        throw new Error('Ordenação por last_activity não está decrescente.');
      }
    }
  }

  const { data: filtrado, error: filtroErro } = await supabase
    .from('deals')
    .select('id, company_name, stage')
    .eq('stage', 'Closed Won')
    .limit(5);

  if (filtroErro) {
    throw new Error(`Filtro por estágio falhou: ${filtroErro.message}`);
  }

  console.log(`🎯 Filtro stage=Closed Won retornou ${filtrado?.length ?? 0} registros.`);
}

async function checkTasksPagination() {
  printDivider('Tarefas - Paginação e Status');
  const pageSize = 8;

  const { data: tarefasA, error: erroA } = await supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .range(0, pageSize - 1);

  if (erroA) {
    throw new Error(`Falha ao obter tarefas (página 1): ${erroA.message}`);
  }

  const { data: tarefasB, error: erroB } = await supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .range(pageSize, pageSize * 2 - 1);

  if (erroB) {
    throw new Error(`Falha ao obter tarefas (página 2): ${erroB.message}`);
  }

  ensureNoOverlap(tarefasA ?? [], tarefasB ?? [], 'id');

  const statusDesejado = tarefasA?.[0]?.status;
  if (statusDesejado) {
    const { data: filtroStatus, error: erroFiltro } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('status', statusDesejado)
      .limit(5);

    if (erroFiltro) {
      throw new Error(`Filtro por status falhou: ${erroFiltro.message}`);
    }

    console.log(`📌 Filtro status='${statusDesejado}' retornou ${filtroStatus?.length ?? 0} tarefas.`);
  }

  console.log(`✅ Paginação e filtros de tarefas verificados (${tarefasA?.length ?? 0} + ${tarefasB?.length ?? 0}).`);
}

async function main() {
  console.log('\n🧪 Validação de paginação/filtros no Supabase');
  try {
    await checkEmpresasPagination();
    await checkDealsOrdering();
    await checkTasksPagination();
    console.log('\n✅ Testes concluídos com sucesso.');
  } catch (error) {
    console.error(`\n❌ Falha na validação: ${error.message}`);
    process.exit(1);
  }
}

main();