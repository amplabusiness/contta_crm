// Script para testar busca de CNPJ
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const cnpj = process.argv[2] || '27865757000102'; // CNPJ de exemplo (Google Brasil)

console.log('\n🔍 Testando busca de CNPJ:', cnpj, '\n');

async function testarCNPJ(cnpj) {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  
  console.log('Tentando BrasilAPI...');
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ BrasilAPI funcionou!');
      console.log('   Razão Social:', data.razao_social);
      console.log('   Nome Fantasia:', data.nome_fantasia || 'N/A');
      console.log('   Situação:', data.descricao_situacao_cadastral);
      return data;
    }
  } catch (error) {
    console.log('❌ BrasilAPI falhou');
  }

  console.log('\nTentando ReceitaWS...');
  try {
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK') {
        console.log('✅ ReceitaWS funcionou!');
        console.log('   Razão Social:', data.nome);
        console.log('   Nome Fantasia:', data.fantasia || 'N/A');
        console.log('   Situação:', data.situacao);
        return data;
      }
    }
  } catch (error) {
    console.log('❌ ReceitaWS falhou');
  }

  const cnpjaKey = process.env.CNPJA_API_KEY;
  if (cnpjaKey) {
    console.log('\nTentando CNPJA...');
    try {
      const response = await fetch(`https://www.cnpja.com/api/v1/company/${cnpjLimpo}`, {
        headers: {
          'Authorization': `Bearer ${cnpjaKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ CNPJA funcionou!');
        console.log('   Razão Social:', data.name);
        return data;
      }
    } catch (error) {
      console.log('❌ CNPJA falhou');
    }
  }

  console.log('\n❌ Nenhuma API funcionou. Verifique sua conexão com a internet.');
}

testarCNPJ(cnpj).catch(console.error);

