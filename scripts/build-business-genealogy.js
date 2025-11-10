#!/usr/bin/env node
/**
 * 🌳 GENEALOGIA EMPRESARIAL - Construtor de Rede até 4º Grau
 * 
 * Estratégia de Prospecção Inteligente:
 * 1. Busca sócios das 196 empresas existentes (Fase 1)
 * 2. Para cada sócio, busca TODAS empresas que ele participa (Fase 2)
 * 3. Busca sócios das novas empresas (Fase 3)
 * 4. Identifica PARENTES (sobrenome, CPF) até 4º grau (Fase 4)
 * 5. Constrói árvore genealógica completa
 * 
 * Cache inteligente: Supabase (30 dias) + Redis (5 min)
 * Rate limiting: 5 req/min CNPJá API (evita bloqueio)
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

config({ path: join(rootDir, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CNPJA_API_KEY = process.env.CNPJA_API_KEY || process.env.VITE_CNPJA_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY necessárias');
  process.exit(1);
}

if (!CNPJA_API_KEY) {
  console.warn('⚠️  CNPJA_API_KEY não configurada');
  console.warn('   Execute: node scripts/setup-cnpja.js');
  console.warn('   Ou adicione manualmente no .env.local\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// CACHE & RATE LIMITING
// ============================================

const cache = new Map(); // Cache em memória (session)
const RATE_LIMIT_MS = 1000; // 60 req/min = 1s por request (API CNPJá é rápida!)
let lastRequestTime = 0;
const BUCKET_NAME = 'empresas-documentos';

// 🎉 DESCOBERTA: Consultas CNPJ são GRATUITAS (0 créditos)!
// Apenas PDFs/certidões consomem créditos
// Rate limit real: 60/min (não 5/min)

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
    console.log(`   ⏳ Rate limit: aguardando ${(waitTime / 1000).toFixed(1)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return fetch(url, options);
}

// ============================================
// DOWNLOAD DE DOCUMENTOS PDF
// ============================================

async function downloadDocuments(cnpj) {
  const normalized = cnpj.replace(/\D/g, '');
  
  try {
    // Verificar se já tem documentos baixados (cache de 90 dias)
    const { data: existing } = await supabase
      .from('empresa_documentos')
      .select('tipo_documento, baixado_em')
      .eq('cnpj', normalized)
      .gte('baixado_em', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    
    if (existing && existing.length >= 2) {
      console.log(`   📄 Documentos já baixados (cache válido)`);
      return;
    }

    console.log(`   📄 Baixando documentos PDF...`);

    // 1. Cartão CNPJ
    await downloadAndSaveDocument(normalized, 'cartao-cnpj', `/office/${normalized}/card.pdf`);
    
    // Delay entre downloads
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Quadro de Sócios (QSA)
    await downloadAndSaveDocument(normalized, 'qsa', `/office/${normalized}/members.pdf`);
    
  } catch (error) {
    console.warn(`   ⚠️  Erro ao baixar documentos: ${error.message}`);
  }
}

async function downloadAndSaveDocument(cnpj, tipo, endpoint) {
  try {
    const response = await rateLimitedFetch(`https://api.cnpja.com${endpoint}`, {
      headers: {
        'Authorization': CNPJA_API_KEY,
      },
    });

    if (!response.ok) {
      console.warn(`   ⚠️  ${tipo} não disponível (${response.status})`);
      return;
    }

    const buffer = await response.buffer();
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const filePath = `${cnpj}/${tipo}.pdf`;

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.warn(`   ⚠️  Erro ao salvar ${tipo}: ${error.message}`);
      return;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Registrar no banco
    await supabase.from('empresa_documentos').upsert({
      cnpj,
      tipo_documento: tipo,
      url_storage: urlData.publicUrl,
      tamanho_bytes: buffer.length,
      baixado_em: new Date().toISOString(),
    }, { onConflict: 'cnpj,tipo_documento,versao', ignoreDuplicates: false });

    console.log(`   ✅ ${tipo}.pdf salvo (${(buffer.length / 1024).toFixed(1)} KB)`);

  } catch (error) {
    console.warn(`   ⚠️  Erro download ${tipo}: ${error.message}`);
  }
}

function normalizeTaxId(rawTaxId = '') {
  if (!rawTaxId) return '';
  return String(rawTaxId).replace(/[^0-9*]/g, '');
}

function parsePercentage(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const normalized = String(value).replace('%', '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

// ============================================
// API CNPJá - Busca de Empresas e Sócios
// ============================================

async function fetchCNPJData(cnpj) {
  const normalized = cnpj.replace(/\D/g, '');
  
  // Check cache
  if (cache.has(normalized)) {
    console.log(`   📦 Cache HIT: ${normalized}`);
    return cache.get(normalized);
  }

  const cachedCompany = await getCompanyWithMembersFromSupabase(normalized);

  if (cachedCompany) {
    console.log(`   💾 Supabase cache: ${cachedCompany.razao_social || normalized}`);
    cache.set(normalized, cachedCompany);
    return cachedCompany;
  }

  // Fetch da API CNPJá
  if (!CNPJA_API_KEY) {
    console.log(`   🤖 MOCK: ${normalized}`);
    return null; // Modo MOCK se não tiver API key
  }
  
  console.log(`   🌐 Fetching CNPJá API: ${normalized}`);
  
  try {
    const response = await rateLimitedFetch(
      `https://api.cnpja.com/office/${normalized}`,
      {
        headers: {
          'Authorization': CNPJA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.error(`   ❌ CNPJá API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Normalizar formato
    const empresa = {
      cnpj: normalized,
      razao_social: data.company?.name || data.alias || 'Razão Social Desconhecida',
      nome_fantasia: data.alias,
      situacao_cadastral: data.status?.text,
      data_abertura: data.founded,
      porte: data.size?.text,
      logradouro: data.address?.street,
      numero: data.address?.number,
      bairro: data.address?.district,
      cidade: data.address?.city,
      uf: data.address?.state,
      cep: data.address?.zip,
      latitude: data.address?.coordinates?.latitude,
      longitude: data.address?.coordinates?.longitude,
      cnae_principal_codigo: data.mainActivity?.code,
      cnae_principal_descricao: data.mainActivity?.text,
      telefones: data.phones?.map(p => p.number) || [],
      emails: data.emails?.map(e => e.address) || [],
    };
    
    // Salvar empresa no Supabase
    const { error: empresaError } = await supabase
      .from('empresas')
      .upsert(empresa, { onConflict: 'cnpj' });

    if (empresaError) {
      console.warn(`   ⚠️  Erro ao salvar empresa ${normalized}: ${empresaError.message}`);
    }

    // Captura de sócios retornados pela API
    const apiMembers = data.company?.members || [];
    const normalizedMembers = [];
    
    for (const member of apiMembers) {
      const person = member?.person || {};
      const rawTaxId = normalizeTaxId(
        person.tax_id ||
        person.taxId ||
        person.document ||
        member.document ||
        member.tax_id ||
        member.taxId
      );

      const nomeSocio = (person.name || member.name || '').trim();

      if (!rawTaxId || !nomeSocio) {
        continue;
      }

      const socioPayload = {
        cpf_parcial: rawTaxId,
        nome_socio: nomeSocio,
      };

      const { error: socioError } = await supabase
        .from('socios')
        .upsert(socioPayload, { onConflict: 'cpf_parcial' });

      if (socioError) {
        console.warn(`   ⚠️  Erro ao salvar sócio ${rawTaxId}: ${socioError.message}`);
        continue;
      }

      const percentual = parsePercentage(
        member.equity_share ??
        member.share_percentage ??
        member.share ??
        member.participation ??
        person.equity_share ??
        null
      );

      const relacaoPayload = {
        empresa_cnpj: normalized,
        socio_cpf_parcial: rawTaxId,
        qualificacao: member.role?.text || member.role || null,
        percentual_capital: percentual,
      };

      const { error: relacaoError } = await supabase
        .from('empresa_socios')
        .upsert(relacaoPayload, {
          onConflict: 'empresa_cnpj,socio_cpf_parcial',
          ignoreDuplicates: false,
        });

      if (relacaoError) {
        console.warn(
          `   ⚠️  Erro ao salvar relação ${normalized} -> ${rawTaxId}: ${relacaoError.message}`
        );
        continue;
      }

      const roleText = member.role?.text || member.role || null;

      normalizedMembers.push({
        person: {
          tax_id: rawTaxId,
          name: nomeSocio,
          type: person.type || 'NATURAL',
        },
        role: roleText ? { text: roleText } : undefined,
        equity_share: relacaoPayload.percentual_capital,
        since: member.since || null,
      });
    }
    
    // 📄 Download de PDFs (apenas se configurado)
    if (config.baixarPDFs) {
      await downloadDocuments(normalized);
    }
    
    cache.set(normalized, { ...empresa, members: normalizedMembers });
    return { ...empresa, members: normalizedMembers };
    
  } catch (err) {
    console.error(`   ❌ Erro ao buscar ${normalized}: ${err.message}`);
    return null;
  }
}

async function getCompanyWithMembersFromSupabase(normalizedCnpj) {
  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('cnpj', normalizedCnpj)
    .maybeSingle();

  if (error || !empresa) {
    return null;
  }

  const { data: relacoes, error: relError } = await supabase
    .from('empresa_socios')
    .select('socio_cpf_parcial, qualificacao, percentual_capital')
    .eq('empresa_cnpj', normalizedCnpj);

  if (relError) {
    console.warn(`   ⚠️  Erro ao buscar relacionamentos de ${normalizedCnpj}: ${relError.message}`);
    return empresa;
  }

  if (!relacoes || relacoes.length === 0) {
    return null; // força chamada da API para popular sócios
  }

  const socioCpfs = relacoes.map((rel) => rel.socio_cpf_parcial).filter(Boolean);

  const { data: socios, error: sociosError } = await supabase
    .from('socios')
    .select('cpf_parcial, nome_socio')
    .in('cpf_parcial', socioCpfs);

  if (sociosError) {
    console.warn(`   ⚠️  Erro ao buscar sócios de ${normalizedCnpj}: ${sociosError.message}`);
  }

  const socioMap = new Map((socios || []).map((socio) => [socio.cpf_parcial, socio.nome_socio]));

  const members = relacoes.map((rel) => ({
    person: {
      tax_id: rel.socio_cpf_parcial,
      name: socioMap.get(rel.socio_cpf_parcial) || 'Sócio não identificado',
      type: 'NATURAL',
    },
    role: { text: rel.qualificacao },
    equity_share: rel.percentual_capital || 0,
  }));

  return { ...empresa, members };
}

async function fetchSocioEmpresas(cpfParcial, nomeSocio) {
  // Buscar empresas onde este sócio participa via API CNPJá
  // CNPJá não tem endpoint direto para isso, então vamos usar a busca
  
  if (!CNPJA_API_KEY) {
    console.log(`   🤖 MOCK: Empresas de ${nomeSocio}`);
    return [];
  }
  
  console.log(`   🔍 Buscando empresas de: ${nomeSocio}`);
  
  try {
    const response = await rateLimitedFetch(
      `https://api.cnpja.com/office?name=${encodeURIComponent(nomeSocio)}&limit=20`,
      {
        headers: {
          'Authorization': CNPJA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.companies || [];
    
  } catch (err) {
    console.error(`   ❌ Erro ao buscar empresas de ${nomeSocio}: ${err.message}`);
    return [];
  }
}

// ============================================
// IDENTIFICAÇÃO DE PARENTES
// ============================================

function extractLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1].toUpperCase();
}

function areRelated(socio1, socio2) {
  // Estratégia 1: Sobrenome igual
  const lastName1 = extractLastName(socio1.nome_socio);
  const lastName2 = extractLastName(socio2.nome_socio);
  
  if (lastName1 && lastName2 && lastName1 === lastName2 && lastName1.length > 3) {
    return { related: true, method: 'sobrenome', confidence: 0.7 };
  }
  
  // Estratégia 2: CPF parcial similar (primeiros 9 dígitos = mesma família em alguns casos)
  if (socio1.cpf_parcial && socio2.cpf_parcial) {
    const cpf1Prefix = socio1.cpf_parcial.slice(0, 6);
    const cpf2Prefix = socio2.cpf_parcial.slice(0, 6);
    
    if (cpf1Prefix === cpf2Prefix) {
      return { related: true, method: 'cpf_similar', confidence: 0.5 };
    }
  }
  
  return { related: false };
}

// ============================================
// CONSTRUÇÃO DA ÁRVORE GENEALÓGICA
// ============================================

class GenealogyTree {
  constructor() {
    this.nodes = new Map(); // cpf_parcial -> { socio, empresas, grau, parentes }
    this.edges = new Set(); // relacionamentos
  }
  
  addSocio(socio, grau = 0) {
    if (!this.nodes.has(socio.cpf_parcial)) {
      this.nodes.set(socio.cpf_parcial, {
        socio,
        empresas: new Set(),
        grau,
        parentes: new Set(),
      });
    }
    return this.nodes.get(socio.cpf_parcial);
  }
  
  addEmpresa(cpfParcial, cnpj) {
    const node = this.nodes.get(cpfParcial);
    if (node) {
      node.empresas.add(cnpj);
    }
  }
  
  addRelationship(cpf1, cpf2, type = 'parente') {
    const edge = [cpf1, cpf2].sort().join('|') + `|${type}`;
    this.edges.add(edge);
    
    const node1 = this.nodes.get(cpf1);
    const node2 = this.nodes.get(cpf2);
    
    if (node1) node1.parentes.add(cpf2);
    if (node2) node2.parentes.add(cpf1);
  }
  
  getSociosByGrau(grau) {
    return Array.from(this.nodes.values()).filter(n => n.grau === grau);
  }
  
  printSummary() {
    console.log('\n📊 RESUMO DA ÁRVORE GENEALÓGICA:\n');
    console.log(`   Total de sócios: ${this.nodes.size}`);
    console.log(`   Total de relacionamentos: ${this.edges.size}`);
    
    for (let grau = 0; grau <= 4; grau++) {
      const socios = this.getSociosByGrau(grau);
      if (socios.length > 0) {
        console.log(`   Grau ${grau}: ${socios.length} sócios`);
      }
    }
    
    const totalEmpresas = new Set();
    this.nodes.forEach(node => {
      node.empresas.forEach(cnpj => totalEmpresas.add(cnpj));
    });
    console.log(`   Total de empresas na rede: ${totalEmpresas.size}`);
  }
}

// ============================================
// CONFIGURAÇÃO E FLAGS DE CONTROLE
// ============================================

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    fase: 1, // Padrão: apenas Fase 1
    baixarPDFs: false, // Padrão: NÃO baixar PDFs (sob demanda)
    expandirRede: false, // Padrão: NÃO expandir rede (seletivo)
    grauMaximo: 2, // Padrão: até 2º grau (controlado)
    limiteEmpresasFase2: 50, // Limite de empresas na Fase 2
    limiteSociosFase2: 10, // Limite de sócios para expandir
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fase') {
      config.fase = parseInt(args[i + 1]) || 1;
    } else if (args[i] === '--pdf') {
      config.baixarPDFs = true;
    } else if (args[i] === '--expand') {
      config.expandirRede = true;
    } else if (args[i] === '--max-degree') {
      config.grauMaximo = parseInt(args[i + 1]) || 2;
    } else if (args[i] === '--limite-empresas') {
      config.limiteEmpresasFase2 = parseInt(args[i + 1]) || 50;
    } else if (args[i] === '--limite-socios') {
      config.limiteSociosFase2 = parseInt(args[i + 1]) || 10;
    } else if (args[i] === '--all') {
      // Flag especial: executar tudo
      config.fase = 4;
      config.baixarPDFs = true;
      config.expandirRede = true;
      config.grauMaximo = 4;
      config.limiteEmpresasFase2 = 999999;
      config.limiteSociosFase2 = 999999;
    }
  }

  return config;
}

function estimarCusto(config, totalEmpresas) {
  let requests = 0;
  let tempo = 0;
  let creditos = 0; // Créditos CNPJá (₪)

  // Fase 1: empresas base (cache + consultas GRATUITAS)
  requests += totalEmpresas;
  tempo += (totalEmpresas * 1) / 60; // 1s por request
  creditos += 0; // ✅ GRÁTIS!

  // PDFs: ESTES consomem créditos (estimativa)
  if (config.baixarPDFs) {
    requests += totalEmpresas * 2; // Cartão + QSA
    tempo += (totalEmpresas * 2 * 1) / 60; // 1s por doc
    creditos += totalEmpresas * 2 * 0.5; // ~0.5₪ por PDF (estimativa)
  }

  // Fase 2: Empresas dos sócios (GRATUITAS!)
  if (config.fase >= 2 && config.expandirRede) {
    const sociosEstimados = totalEmpresas * 3;
    const empresasSocios = Math.min(sociosEstimados * 5, config.limiteEmpresasFase2);
    requests += empresasSocios;
    tempo += (empresasSocios * 1) / 60;
    creditos += 0; // ✅ GRÁTIS!
  }

  // Fase 3-4: Rede genealógica (GRATUITAS!)
  if (config.fase >= 3 && config.expandirRede) {
    const fator = Math.pow(5, config.grauMaximo - 1);
    const novasEmpresas = Math.min(totalEmpresas * fator, config.limiteEmpresasFase2 * 2);
    requests += novasEmpresas;
    tempo += (novasEmpresas * 1) / 60;
    creditos += 0; // ✅ GRÁTIS!
  }

  return {
    requests,
    creditos, // Créditos CNPJá (₪)
    tempoMinutos: tempo,
    tempoHoras: (tempo / 60).toFixed(1),
  };
}

function exibirConfiguracao(config, estimativa) {
  console.log('\n⚙️  CONFIGURAÇÃO:\n');
  console.log(`   Fase máxima: ${config.fase}`);
  console.log(`   Baixar PDFs: ${config.baixarPDFs ? '✅ SIM' : '❌ NÃO (sob demanda recomendado)'}`);
  console.log(`   Expandir rede: ${config.expandirRede ? '✅ SIM' : '❌ NÃO (seletivo recomendado)'}`);
  console.log(`   Grau máximo: ${config.grauMaximo}º`);
  console.log(`   Limite empresas Fase 2: ${config.limiteEmpresasFase2}`);
  console.log(`   Limite sócios Fase 2: ${config.limiteSociosFase2}\n`);
  
  console.log('💰 ESTIMATIVA DE CUSTO (ATUALIZADA):\n');
  console.log(`   Requests API: ~${estimativa.requests}`);
  console.log(`   🎉 Consultas CNPJ: GRATUITAS (0 ₪)`);
  console.log(`   💳 Créditos PDFs: ~${estimativa.creditos.toFixed(1)} ₪`);
  console.log(`   ⏱️  Tempo: ~${estimativa.tempoMinutos.toFixed(0)} min (${estimativa.tempoHoras}h)`);
  console.log(`   🚀 Rate limit: 60 requests/min\n`);

  if (estimativa.creditos > 500) {
    console.log('⚠️  ATENÇÃO: Custo de PDFs elevado!\n');
    console.log('   Recomendação: Não use --pdf (download sob demanda)\n');
  } else if (estimativa.requests > 1000) {
    console.log('💡 Dica: Consultas CNPJ são GRATUITAS!\n');
    console.log('   Pode expandir rede à vontade (0 créditos)');
    console.log('   Apenas PDFs consomem créditos\n');
  }
}

// ============================================
// PROCESSAMENTO PRINCIPAL
// ============================================

async function main() {
  console.log('\n🌳 CONSTRUTOR DE GENEALOGIA EMPRESARIAL - OTIMIZADO\n');
  console.log('═'.repeat(60));
  
  // Parse argumentos
  const config = parseArgs();
  const tree = new GenealogyTree();
  
  // Buscar total de empresas
  const { count: totalEmpresas } = await supabase
    .from('empresas')
    .select('*', { count: 'exact', head: true });
  
  // Estimar custo
  const estimativa = estimarCusto(config, totalEmpresas || 196);
  
  // Exibir configuração
  exibirConfiguracao(config, estimativa);
  
  // Confirmação apenas se PDFs (que consomem créditos)
  if (config.baixarPDFs && estimativa.creditos > 500) {
    console.log('⏸️  Execução pausada. PDFs consomem créditos.\n');
    console.log('   node scripts/build-business-genealogy.js --fase=2 --expand  # SEM PDFs');
    console.log('   node scripts/build-business-genealogy.js --fase=2 --expand --pdf --yes  # COM PDFs\n');
    
    if (!process.argv.includes('--yes')) {
      console.log('❌ Execução cancelada. Use --yes para confirmar download de PDFs.\n');
      process.exit(0);
    }
  }
  
  console.log('🚀 Iniciando processamento...\n');
  console.log('═'.repeat(60));
  
  // ============================================
  // FASE 1: Buscar sócios das 196 empresas existentes
  // ============================================
  
  console.log('\n📍 FASE 1: Buscando sócios das empresas existentes\n');
  
  const { data: empresas, error } = await supabase
    .from('empresas')
    .select('cnpj, razao_social')
    .limit(196);
  
  if (error || !empresas) {
    console.error('❌ Erro ao buscar empresas:', error?.message);
    return;
  }
  
  console.log(`   Total de empresas: ${empresas.length}\n`);
  
  let processedCount = 0;
  
  for (const empresa of empresas) {
    processedCount++;
    console.log(`[${processedCount}/${empresas.length}] ${empresa.razao_social}`);
    
    const data = await fetchCNPJData(empresa.cnpj);
    
    if (data?.members && Array.isArray(data.members)) {
      for (const member of data.members) {
        if (member.person?.tax_id) {
          const cpfParcial = member.person.tax_id.slice(0, -2) + '**'; // Oculta últimos 2 dígitos
          const nomeSocio = member.person.name || member.name || 'Sócio Desconhecido';
          
          // Salvar sócio no Supabase
          await supabase.from('socios').upsert({
            cpf_parcial: cpfParcial,
            nome_socio: nomeSocio,
          }, { onConflict: 'cpf_parcial' });
          
          // Salvar relacionamento empresa-sócio
          await supabase.from('empresa_socios').upsert({
            empresa_cnpj: empresa.cnpj,
            socio_cpf_parcial: cpfParcial,
            qualificacao: member.role?.text,
          }, { onConflict: 'empresa_cnpj,socio_cpf_parcial' });
          
          // Adicionar à árvore (grau 0 = sócios diretos)
          const node = tree.addSocio({
            cpf_parcial: cpfParcial,
            nome_socio: nomeSocio,
          }, 0);
          tree.addEmpresa(cpfParcial, empresa.cnpj);
          
          console.log(`      ✅ Sócio: ${nomeSocio} (${cpfParcial})`);
        }
      }
    }
  }
  
  console.log(`\n✅ Fase 1 completa: ${tree.nodes.size} sócios encontrados\n`);
  
  // ============================================
  // FASE 2: Buscar empresas dos sócios (OPCIONAL)
  // ============================================
  
  if (config.fase >= 2 && config.expandirRede) {
    console.log('\n📍 FASE 2: Expandindo para empresas dos sócios\n');
    
    const sociosGrau0 = tree.getSociosByGrau(0);
    const limiteSocios = Math.min(sociosGrau0.length, config.limiteSociosFase2);
    
    console.log(`   Total de sócios: ${sociosGrau0.length}`);
    console.log(`   Processando: ${limiteSocios} sócios (limite configurado)\n`);
    
    let socioProcessedCount = 0;
    
    for (const node of sociosGrau0.slice(0, limiteSocios)) {
      socioProcessedCount++;
      const { socio } = node;
      
      console.log(`[${socioProcessedCount}/${limiteSocios}] Buscando empresas de: ${socio.nome_socio}`);
      
      const empresasDoSocio = await fetchSocioEmpresas(socio.cpf_parcial, socio.nome_socio);
      
      for (const emp of empresasDoSocio.slice(0, 10)) { // Limitar 10 empresas por sócio
        if (emp.tax_id) {
          tree.addEmpresa(socio.cpf_parcial, emp.tax_id);
          
          // Buscar dados completos e salvar
          await fetchCNPJData(emp.tax_id);
          
          console.log(`      ✅ Empresa: ${emp.alias || emp.tax_id}`);
        }
      }
    }
    
    console.log(`\n✅ Fase 2 completa (${limiteSocios} sócios processados)\n`);
  } else {
    console.log('\n⏭️  FASE 2: Pulada (use --fase=2 --expand para executar)\n');
    console.log('   💡 Recomendação: Expansão de rede sob demanda via interface\n');
  }
  
  // ============================================
  // FASE 3 & 4: Identificar parentes e expandir (OPCIONAL)
  // ============================================
  
  if (config.fase >= 3 && config.expandirRede) {
    console.log('\n📍 FASE 3-4: Identificando parentes e expandindo rede\n');
    
    const allSocios = Array.from(tree.nodes.values());
    let parentesEncontrados = 0;
    
    for (let i = 0; i < allSocios.length; i++) {
      for (let j = i + 1; j < allSocios.length; j++) {
        const resultado = areRelated(allSocios[i].socio, allSocios[j].socio);
        
        if (resultado.related) {
          tree.addRelationship(
            allSocios[i].socio.cpf_parcial,
            allSocios[j].socio.cpf_parcial,
            resultado.method
          );
          parentesEncontrados++;
          
          console.log(`   👨‍👩‍👧‍👦 Parentes: ${allSocios[i].socio.nome_socio} <-> ${allSocios[j].socio.nome_socio} (${resultado.method})`);
        }
      }
    }
    
    console.log(`\n✅ ${parentesEncontrados} relacionamentos familiares identificados\n`);
  } else {
    console.log('\n⏭️  FASE 3-4: Pulada (use --fase=3 --expand para executar)\n');
  }
  
  // ============================================
  // RESUMO FINAL
  // ============================================
  
  tree.printSummary();
  
  console.log('\n═'.repeat(60));
  console.log('✅ GENEALOGIA EMPRESARIAL COMPLETA!\n');
  
  console.log('📝 Resultados salvos em:');
  console.log(`   - Tabela socios: ${tree.nodes.size} registros`);
  console.log('   - Tabela empresa_socios: relacionamentos');
  if (config.baixarPDFs) {
    console.log('   - Storage empresas-documentos: PDFs baixados\n');
  } else {
    console.log('   - PDFs: Não baixados (use --pdf ou download sob demanda)\n');
  }
  
  console.log('💡 Próximos passos recomendados:\n');
  
  if (config.fase === 1) {
    console.log('   ✅ Base consolidada! Agora implemente:');
    console.log('   1. Busca avançada: /api/companies-search + PesquisaAvancada.tsx');
    console.log('   2. Download PDFs sob demanda: Ver EmpresaDetalhe.tsx');
    console.log('   3. Expansão seletiva: Apenas prospects com score > 80\n');
    console.log('   Para expandir rede manualmente:');
    console.log('   node scripts/build-business-genealogy.js --fase=2 --expand --limite-socios=10\n');
  } else if (config.fase >= 2) {
    console.log('   1. Validar dados: node scripts/check-socios.js');
    console.log('   2. Criar endpoint: /api/network/{cnpj}');
    console.log('   3. Visualização: D3.js ou React Flow\n');
  }
  
  console.log('📊 Estatísticas de uso:');
  console.log(`   🎉 Consultas CNPJ: GRATUITAS (0 ₪)`);
  console.log(`   💳 Créditos usados: ~${estimativa.creditos.toFixed(1)} ₪ (apenas PDFs)`);
  console.log(`   ⏱️  Tempo total: ${estimativa.tempoMinutos.toFixed(0)} min\n`);
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
