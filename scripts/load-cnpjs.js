// Script para carregar CNPJs no banco de dados
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Carregar variáveis de ambiente
config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const cnpjaBaseUrl = (process.env.CNPJA_BASE_URL || 'https://api.cnpja.com').replace(/\/$/, '');
const cnpjaApiKey = process.env.CNPJA_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Erro: Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY não encontradas!');
  console.log('\n📝 Configure no arquivo .env.local:\n');
  console.log('   SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('   SUPABASE_SERVICE_KEY=sua-chave-service-role\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseDate(dateString) {
  if (!dateString) {
    return null;
  }

  const trimmed = dateString.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Função utilitária para normalizar telefones
function normalizarTelefones(...sources) {
  const phones = [];

  const adicionar = valor => {
    if (!valor) return;
    const raw = typeof valor === 'string' ? valor : valor.number || valor.value || valor.contact;
    if (!raw) return;
    const cleaned = raw.trim();
    if (cleaned) {
      phones.push(cleaned);
    }
  };

  sources.flat().forEach(source => {
    if (!source) return;

    if (Array.isArray(source)) {
      source.forEach(adicionar);
      return;
    }

    if (typeof source === 'string') {
      adicionar(source);
      return;
    }

    if (Array.isArray(source.phones)) {
      source.phones.forEach(adicionar);
    }
    if (Array.isArray(source.telephones)) {
      source.telephones.forEach(adicionar);
    }

    if (!source.phones && !source.telephones) {
      adicionar(source);
    }
  });

  return [...new Set(phones)];
}

// Função utilitária para normalizar e-mails
function normalizarEmails(...sources) {
  const emails = [];

  const adicionar = valor => {
    if (!valor) return;
    const raw = typeof valor === 'string' ? valor : valor.address || valor.email || valor.contact;
    if (!raw) return;
    const cleaned = raw.trim().toLowerCase();
    if (cleaned) {
      emails.push(cleaned);
    }
  };

  sources.flat().forEach(source => {
    if (!source) return;

    if (Array.isArray(source)) {
      source.forEach(adicionar);
      return;
    }

    if (typeof source === 'string') {
      adicionar(source);
      return;
    }

    if (Array.isArray(source.emails)) {
      source.emails.forEach(adicionar);
    }

    if (!source.emails) {
      adicionar(source);
    }
  });

  return [...new Set(emails)];
}

function transformarDadosCNPJa(payload, cnpjLimpo) {
  if (!payload) {
    return null;
  }

  const company = payload.company || {};
  const alias = payload.alias || payload.tradeName || company.alias || '';
  const status = payload.status?.text || payload.status || company.status?.text || 'Ativa';
  const address = payload.address || company.address || {};
  const primaryActivity = payload.activities?.primary || payload.mainActivity || payload.primaryActivity || {};
  const contacts = payload.contacts || {};
  const members = payload.members || payload.partners || payload.shareholders || payload.participants || [];

  const socios = members
    .map(member => {
      const person = member.person || member;
      const rawTaxId = person?.taxId || member?.taxId || member?.document || '';
      const cpf = rawTaxId.replace(/[^\d]/g, '').slice(0, 11);
      const nome = person?.name || person?.alias || member?.name || '';
      if (!cpf && !nome) {
        return null;
      }
      return {
        cpf_parcial: cpf,
        nome_socio: nome,
        qualificacao: member.role?.text || member.role || '',
        percentual_capital: member.equity ?? member.share ?? member.percent ?? 0,
      };
    })
    .filter(Boolean)
    .filter(socio => socio.nome_socio);

  return {
    cnpj: cnpjLimpo,
    razao_social: payload.name || company.name || '',
    nome_fantasia: alias || payload.alias_name || '',
    situacao_cadastral: status,
    data_abertura: parseDate(company.opening || company.opening_date || payload.opening || payload.since),
    porte: company.size?.text || company.size?.acronym || company.size || '',
    logradouro: address.street || address.public_place || '',
    numero: address.number ? String(address.number) : '',
    bairro: address.neighborhood || address.district || '',
    cidade: address.city?.name || address.city || '',
    uf: address.state?.acronym || address.state || '',
    cep: (address.zip || address.zipCode || address.postalCode || '').replace(/[^\d]/g, ''),
    cnae_principal_codigo: primaryActivity.code || primaryActivity.id || '',
    cnae_principal_descricao: primaryActivity.description || primaryActivity.text || '',
    telefones: normalizarTelefones(contacts.phones, contacts.telephones, payload.phones, contacts),
    emails: normalizarEmails(contacts.emails, payload.emails, contacts),
    socios,
  };
}

async function buscarCNPJviaCNPJa(cnpjLimpo) {
  if (!cnpjaApiKey) {
    return null;
  }

  const endpoint = `${cnpjaBaseUrl}/office/${cnpjLimpo}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: cnpjaApiKey,
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Status ${response.status}${detail ? ` - ${detail.slice(0, 120)}` : ''}`);
    }

    const data = await response.json();
    return transformarDadosCNPJa(data, cnpjLimpo);
  } catch (error) {
    console.warn(`⚠️  Falha na consulta CNPJá (${cnpjLimpo}): ${error.message}`);
    return null;
  }
}

// Função para buscar CNPJ na API
async function buscarCNPJ(cnpj) {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');

  const dadosCnpja = await buscarCNPJviaCNPJa(cnpjLimpo);
  if (dadosCnpja) {
    return dadosCnpja;
  }
  
  // Tentar BrasilAPI primeiro
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    if (response.ok) {
      const data = await response.json();
      return transformarDadosBrasilAPI(data, cnpjLimpo);
    }
  } catch (error) {
    // Continuar para próxima API
  }

  // Tentar ReceitaWS
  try {
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK') {
        return transformarDadosReceitaWS(data);
      }
    }
  } catch (error) {
    // Continuar
  }

  throw new Error('CNPJ não encontrado');
}

function transformarDadosBrasilAPI(data, cnpjLimpo) {
  return {
    cnpj: cnpjLimpo,
    razao_social: data.razao_social || '',
    nome_fantasia: data.nome_fantasia || data.razao_social || '',
    situacao_cadastral: data.descricao_situacao_cadastral || 'Ativa',
    data_abertura: parseDate(data.data_inicio_atividade),
    porte: data.porte || 'Demais',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    bairro: data.bairro || '',
    cidade: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep?.replace(/[^\d]/g, '') || '',
    cnae_principal_codigo: data.cnae_fiscal_principal?.codigo || '',
    cnae_principal_descricao: data.cnae_fiscal_principal?.descricao || '',
    telefones: data.telefones || [],
    emails: data.emails || [],
    socios: (data.qsa || []).map(socio => ({
      cpf_parcial: socio.cpf_cnpj?.replace(/[^\d]/g, '').substring(0, 11) || '',
      nome_socio: socio.nome || '',
      qualificacao: socio.qual || '',
      percentual_capital: socio.participacao || 0,
    }))
  };
}

function transformarDadosReceitaWS(data) {
  return {
    cnpj: data.cnpj?.replace(/[^\d]/g, '') || '',
    razao_social: data.nome || '',
    nome_fantasia: data.fantasia || data.nome || '',
    situacao_cadastral: data.situacao || 'Ativa',
    data_abertura: parseDate(data.abertura),
    porte: data.porte || 'Demais',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    bairro: data.bairro || '',
    cidade: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep?.replace(/[^\d]/g, '') || '',
    cnae_principal_codigo: data.atividade_principal?.[0]?.code || '',
    cnae_principal_descricao: data.atividade_principal?.[0]?.text || '',
    telefones: data.telefone ? [data.telefone] : [],
    emails: data.email ? [data.email] : [],
    socios: (data.qsa || []).map(socio => ({
      cpf_parcial: socio.cpf?.replace(/[^\d]/g, '').substring(0, 11) || '',
      nome_socio: socio.nome || '',
      qualificacao: socio.qual || '',
      percentual_capital: 0,
    }))
  };
}

async function salvarEmpresa(dados) {
  // Salvar empresa
  const { error: errorEmpresa } = await supabase
    .from('empresas')
    .upsert({
      cnpj: dados.cnpj,
      razao_social: dados.razao_social,
      nome_fantasia: dados.nome_fantasia,
      situacao_cadastral: dados.situacao_cadastral,
      data_abertura: dados.data_abertura,
      porte: dados.porte,
      logradouro: dados.logradouro,
      numero: dados.numero,
      bairro: dados.bairro,
      cidade: dados.cidade,
      uf: dados.uf,
      cep: dados.cep,
      cnae_principal_codigo: dados.cnae_principal_codigo,
      cnae_principal_descricao: dados.cnae_principal_descricao,
      telefones: dados.telefones,
      emails: dados.emails,
    }, { onConflict: 'cnpj' });

  if (errorEmpresa) {
    throw errorEmpresa;
  }

  // Salvar sócios
  if (dados.socios && dados.socios.length > 0) {
    for (const socio of dados.socios) {
      if (!socio.cpf_parcial || !socio.nome_socio) continue;

      // Inserir sócio
      await supabase
        .from('socios')
        .upsert({
          cpf_parcial: socio.cpf_parcial,
          nome_socio: socio.nome_socio,
        }, { onConflict: 'cpf_parcial' });

      // Criar relação empresa-sócio
      await supabase
        .from('empresa_socios')
        .upsert({
          empresa_cnpj: dados.cnpj,
          socio_cpf_parcial: socio.cpf_parcial,
          qualificacao: socio.qualificacao,
          percentual_capital: socio.percentual_capital,
        }, { onConflict: 'empresa_cnpj,socio_cpf_parcial' });
    }
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 CARGA DE CNPJs NO BANCO DE DADOS');
  console.log('='.repeat(60) + '\n');

  // Verificar arquivo de CNPJs
  const cnpjsFile = join(rootDir, 'cnpjs.txt');
  if (!existsSync(cnpjsFile)) {
    console.error('❌ Arquivo cnpjs.txt não encontrado!');
    console.log('\n📝 Crie o arquivo cnpjs.txt na raiz do projeto com um CNPJ por linha.\n');
    console.log('   Exemplo:');
    console.log('   12345678000190');
    console.log('   98765432000111\n');
    process.exit(1);
  }

  // Ler CNPJs
  const cnpjsContent = readFileSync(cnpjsFile, 'utf-8');
  const cnpjs = cnpjsContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && /^\d+$/.test(line.replace(/[^\d]/g, '')));

  if (cnpjs.length === 0) {
    console.error('❌ Nenhum CNPJ válido encontrado no arquivo!');
    process.exit(1);
  }

  console.log(`📋 Encontrados ${cnpjs.length} CNPJs para processar\n`);

  let sucessos = 0;
  let erros = 0;

  for (let i = 0; i < cnpjs.length; i++) {
    const cnpj = cnpjs[i];
    const progresso = `[${i + 1}/${cnpjs.length}]`;

    try {
      process.stdout.write(`${progresso} Buscando ${cnpj}... `);
      const dados = await buscarCNPJ(cnpj);
      
      process.stdout.write('Salvando... ');
      await salvarEmpresa(dados);
      
      console.log(`✅ ${dados.razao_social || dados.nome_fantasia || 'Empresa'}`);
      sucessos++;

      // Delay para evitar rate limit (1 segundo entre requisições)
      if (i < cnpjs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
      erros++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO:');
  console.log(`   ✅ Sucessos: ${sucessos}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📈 Taxa de sucesso: ${((sucessos / cnpjs.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);

