import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY não foram encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function verificarTabelas(tabelas) {
  const resultados = [];
  for (const tabela of tabelas) {
    const { count, error } = await supabase
      .from(tabela)
      .select('*', { count: 'exact', head: true });

    if (error) {
      resultados.push({ tabela, ok: false, detalhe: error.message });
    } else {
      resultados.push({ tabela, ok: true, registros: count });
    }
  }
  return resultados;
}

async function verificarPoliticas() {
  const endpoint = `${supabaseUrl}/rest/v1/pg_tables?select=tablename,rowsecurity&schemaname=eq.public`;
  const resposta = await fetch(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    },
  });

  if (!resposta.ok) {
    return { ok: false, detalhe: `Falha ao consultar pg_tables (${resposta.status})` };
  }

  const dados = await resposta.json();
  const politicas = dados
    .filter(item => ['profiles', 'empresas', 'socios', 'empresa_socios', 'deals', 'tasks', 'indicacoes'].includes(item.tablename))
    .map(item => ({ tabela: item.tablename, rlsAtivo: !!item.rowsecurity }));

  return { ok: true, politicas };
}

async function main() {
  console.log('\n📋 Verificação do Supabase');
  const tabelasParaChecar = ['profiles', 'empresas', 'socios', 'empresa_socios', 'deals', 'tasks', 'indicacoes'];

  const tabelas = await verificarTabelas(tabelasParaChecar);
  tabelas.forEach(({ tabela, ok, registros, detalhe }) => {
    if (ok) {
      console.log(`✅ Tabela '${tabela}' encontrada (${registros ?? 0} registros)`);
    } else {
      console.log(`❌ Tabela '${tabela}' indisponível: ${detalhe}`);
    }
  });

  const politicas = await verificarPoliticas();
  if (politicas.ok) {
    console.log('\n🔐 RLS - Row Level Security');
    politicas.politicas.forEach(({ tabela, rlsAtivo }) => {
      console.log(`${rlsAtivo ? '✅' : '⚠️'} ${tabela}: RLS ${rlsAtivo ? 'ativo' : 'desativado'}`);
    });
  } else {
    console.log(`\n⚠️ Não foi possível verificar RLS: ${politicas.detalhe}`);
  }
}

main().catch(error => {
  console.error('Erro ao verificar Supabase:', error);
  process.exit(1);
});
