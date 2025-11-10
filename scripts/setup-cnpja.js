#!/usr/bin/env node
/**
 * 📋 SETUP DA CHAVE CNPJá
 * 
 * Este script ajuda a configurar a chave da API CNPJá no .env.local
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔑 CONFIGURAÇÃO DA API CNPJá\n');
  console.log('═'.repeat(60));
  
  console.log('\n📝 A chave CNPJá é necessária para:');
  console.log('   • Buscar dados completos de empresas');
  console.log('   • Buscar sócios e participações societárias');
  console.log('   • Construir rede de relacionamentos empresariais');
  console.log('   • Identificar parentes e empresas relacionadas\n');
  
  console.log('🌐 Se você ainda não tem uma chave:');
  console.log('   1. Acesse: https://www.cnpja.com/api');
  console.log('   2. Crie uma conta ou faça login');
  console.log('   3. Copie sua API Key no dashboard\n');
  
  const apiKey = await question('Cole sua chave CNPJá aqui (ou ENTER para pular): ');
  
  if (!apiKey || apiKey.trim() === '') {
    console.log('\n⚠️  Chave não fornecida - modo MOCK será usado');
    console.log('   Para adicionar depois, edite .env.local:\n');
    console.log('   CNPJA_API_KEY=sua-chave-aqui');
    console.log('   VITE_CNPJA_API_KEY=sua-chave-aqui\n');
    rl.close();
    return;
  }
  
  // Ler .env.local atual
  let envContent = readFileSync(envPath, 'utf-8');
  
  // Substituir chaves
  envContent = envContent
    .replace(/CNPJA_API_KEY=ADICIONE_SUA_CHAVE_CNPJA_AQUI/g, `CNPJA_API_KEY=${apiKey.trim()}`)
    .replace(/VITE_CNPJA_API_KEY=ADICIONE_SUA_CHAVE_CNPJA_AQUI/g, `VITE_CNPJA_API_KEY=${apiKey.trim()}`);
  
  // Salvar
  writeFileSync(envPath, envContent, 'utf-8');
  
  console.log('\n✅ Chave CNPJá configurada com sucesso!');
  console.log('\n📊 Próximo passo:');
  console.log('   node scripts/build-business-genealogy.js\n');
  
  rl.close();
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
