// Script interativo para preencher o arquivo .env.local automaticamente
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY'
];

const OPTIONAL_VARS = [
  'GEMINI_API_KEY'
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const templatePath = join(rootDir, 'env.local.template');
const envPath = join(rootDir, '.env.local');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

const maskValue = (value) => {
  if (!value) return '';
  if (value.length <= 12) return '***';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const parseEnv = (content) => {
  const vars = {};
  content.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith('#')) return;
    const [key, ...rest] = line.split('=');
    if (!key) return;
    vars[key.trim()] = rest.join('=').trim();
  });
  return vars;
};

const buildEnvContent = (template, values) => {
  const lines = template.split(/\r?\n/);
  return lines
    .map((line) => {
      const match = line.match(/^([A-Z0-9_]+)=/);
      if (!match) return line;
      const key = match[1];
      if (!(key in values)) return line;
      return `${key}=${values[key] ?? ''}`;
    })
    .join('\n');
};

async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('⚙️  ASSISTENTE DE CONFIGURAÇÃO DO .env.local');
    console.log('='.repeat(60) + '\n');

    if (!existsSync(templatePath)) {
      console.error('❌ Arquivo env.local.template não encontrado.');
      process.exit(1);
    }

    if (!existsSync(envPath)) {
      copyFileSync(templatePath, envPath);
      console.log('📄 Arquivo .env.local criado a partir do template.\n');
    }

    const templateContent = readFileSync(templatePath, 'utf-8');
    const currentContent = readFileSync(envPath, 'utf-8');
    const currentValues = parseEnv(currentContent);

    const newValues = { ...currentValues };

    console.log('🔐 Informe as credenciais obtidas no Supabase Dashboard (Settings > API).');
    console.log('   Pressione ENTER para manter o valor atual.\n');

    for (const key of REQUIRED_VARS) {
      const current = currentValues[key] ?? '';
      const answer = await question(`${key}${current ? ` [atual: ${maskValue(current)}]` : ''}: `);
      newValues[key] = answer.trim() ? answer.trim() : current;
    }

    console.log('\n🤖 Variáveis opcionais (AI, integrações, etc.):\n');
    for (const key of OPTIONAL_VARS) {
      const current = currentValues[key] ?? '';
      const answer = await question(`${key}${current ? ` [atual: ${maskValue(current)}]` : ''}: `);
      newValues[key] = answer.trim() ? answer.trim() : current;
    }

    const finalContent = buildEnvContent(templateContent, newValues);
    writeFileSync(envPath, finalContent, 'utf-8');

    console.log('\n✅ .env.local atualizado com sucesso!');
    console.log('\nPróximos passos recomendados:');
    console.log(' 1. Execute: npm run check-env');
    console.log(' 2. Configure as mesmas chaves na Vercel (vercel env add ...)');
    console.log(' 3. Rode o backend: vercel dev\n');
  } catch (error) {
    console.error('\n❌ Erro ao configurar o .env.local:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
