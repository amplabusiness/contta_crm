/**
 * Verificar dados da tabela socios
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSocios() {
  console.log('📊 Verificando dados de sócios...\n');

  // 1. Contar sócios
  const { count: totalSocios } = await supabase
    .from('socios')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Total de sócios: ${totalSocios || 0}`);

  // 2. Contar empresa_socios
  const { count: totalRelacoes } = await supabase
    .from('empresa_socios')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Total de relações empresa_socios: ${totalRelacoes || 0}\n`);

  // 3. Amostra de sócios
  if (totalSocios > 0) {
    const { data: socios } = await supabase
      .from('socios')
      .select('*')
      .limit(5);

    console.log('📋 Amostra de sócios:');
    console.log(JSON.stringify(socios, null, 2));
  }

  // 4. Verificar empresas sem sócios
  const { data: empresas } = await supabase
    .from('empresas')
    .select('cnpj, razao_social')
    .limit(3);

  console.log('\n📋 Testando 3 primeiras empresas:');
  
  for (const empresa of empresas) {
    const { count } = await supabase
      .from('empresa_socios')
      .select('*', { count: 'exact', head: true })
      .eq('cnpj', empresa.cnpj);

    console.log(`   ${empresa.cnpj} (${empresa.razao_social}): ${count || 0} sócios`);
  }
}

checkSocios().catch(console.error);
