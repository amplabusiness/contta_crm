/**
 * Serviço para download e gerenciamento de documentos PDF do CNPJá
 * 
 * Documentos disponíveis:
 * - Cartão CNPJ (Comprovante de Inscrição)
 * - Quadro de Sócios e Administradores (QSA)
 * - Certidão Simplificada
 * 
 * Storage: Supabase Storage bucket 'empresas-documentos'
 * Estrutura: {cnpj}/cartao-cnpj.pdf, {cnpj}/qsa.pdf, {cnpj}/certidao.pdf
 */

import { supabase } from './supabaseClient';

const CNPJA_API_KEY = import.meta.env.VITE_CNPJA_API_KEY;
const CNPJA_API_BASE = 'https://api.cnpja.com';
const STORAGE_BUCKET = 'empresas-documentos';

export interface DocumentInfo {
  cnpj: string;
  tipo: 'cartao-cnpj' | 'qsa' | 'certidao';
  url: string; // URL pública do Supabase Storage
  tamanho: number; // bytes
  baixado_em: string;
}

/**
 * Baixa cartão CNPJ (PDF) da API CNPJá
 */
async function downloadCartaoCNPJ(cnpj: string): Promise<Blob | null> {
  const sanitized = cnpj.replace(/\D/g, '');
  
  try {
    console.log(`📄 Baixando Cartão CNPJ: ${sanitized}...`);
    
    const response = await fetch(`${CNPJA_API_BASE}/office/${sanitized}/card.pdf`, {
      headers: {
        'Authorization': `Bearer ${CNPJA_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(`❌ Cartão CNPJ não disponível: ${response.status}`);
      return null;
    }

    return await response.blob();
  } catch (error) {
    console.error(`❌ Erro ao baixar Cartão CNPJ ${sanitized}:`, error);
    return null;
  }
}

/**
 * Baixa Quadro de Sócios e Administradores (QSA) em PDF
 */
async function downloadQSA(cnpj: string): Promise<Blob | null> {
  const sanitized = cnpj.replace(/\D/g, '');
  
  try {
    console.log(`📄 Baixando QSA: ${sanitized}...`);
    
    const response = await fetch(`${CNPJA_API_BASE}/office/${sanitized}/members.pdf`, {
      headers: {
        'Authorization': `Bearer ${CNPJA_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(`❌ QSA não disponível: ${response.status}`);
      return null;
    }

    return await response.blob();
  } catch (error) {
    console.error(`❌ Erro ao baixar QSA ${sanitized}:`, error);
    return null;
  }
}

/**
 * Salva PDF no Supabase Storage
 */
async function savePDFToStorage(
  cnpj: string,
  tipo: 'cartao-cnpj' | 'qsa' | 'certidao',
  blob: Blob
): Promise<string | null> {
  const sanitized = cnpj.replace(/\D/g, '');
  const filePath = `${sanitized}/${tipo}.pdf`;

  try {
    console.log(`💾 Salvando ${tipo}.pdf no Storage...`);

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true, // Sobrescrever se já existir
      });

    if (error) {
      console.error(`❌ Erro ao salvar ${tipo} no Storage:`, error);
      return null;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log(`✅ ${tipo}.pdf salvo: ${urlData.publicUrl}`);
    return urlData.publicUrl;

  } catch (error) {
    console.error(`❌ Erro ao salvar PDF no Storage:`, error);
    return null;
  }
}

/**
 * Registra documento baixado no banco de dados
 */
async function registerDocument(
  cnpj: string,
  tipo: 'cartao-cnpj' | 'qsa' | 'certidao',
  url: string,
  tamanho: number
): Promise<void> {
  const sanitized = cnpj.replace(/\D/g, '');

  try {
    // Verificar se tabela empresa_documentos existe, senão criar
    const { error } = await supabase.from('empresa_documentos').insert({
      cnpj: sanitized,
      tipo_documento: tipo,
      url_storage: url,
      tamanho_bytes: tamanho,
      baixado_em: new Date().toISOString(),
    });

    if (error) {
      // Se tabela não existe, apenas logar (não bloqueia o fluxo)
      console.warn(`⚠️ Não foi possível registrar documento no DB:`, error.message);
    } else {
      console.log(`✅ Documento ${tipo} registrado no DB`);
    }
  } catch (error) {
    console.warn(`⚠️ Erro ao registrar documento:`, error);
  }
}

/**
 * Download completo de todos documentos de uma empresa
 */
export async function downloadAllDocuments(cnpj: string): Promise<DocumentInfo[]> {
  const sanitized = cnpj.replace(/\D/g, '');
  const documentos: DocumentInfo[] = [];

  if (!CNPJA_API_KEY) {
    console.error('❌ CNPJA_API_KEY não configurada');
    return documentos;
  }

  console.log(`\n📦 Baixando documentos de ${sanitized}...\n`);

  // 1. Cartão CNPJ
  const cartaoBlob = await downloadCartaoCNPJ(sanitized);
  if (cartaoBlob) {
    const url = await savePDFToStorage(sanitized, 'cartao-cnpj', cartaoBlob);
    if (url) {
      await registerDocument(sanitized, 'cartao-cnpj', url, cartaoBlob.size);
      documentos.push({
        cnpj: sanitized,
        tipo: 'cartao-cnpj',
        url,
        tamanho: cartaoBlob.size,
        baixado_em: new Date().toISOString(),
      });
    }
  }

  // Delay entre requests (rate limiting)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Quadro de Sócios (QSA)
  const qsaBlob = await downloadQSA(sanitized);
  if (qsaBlob) {
    const url = await savePDFToStorage(sanitized, 'qsa', qsaBlob);
    if (url) {
      await registerDocument(sanitized, 'qsa', url, qsaBlob.size);
      documentos.push({
        cnpj: sanitized,
        tipo: 'qsa',
        url,
        tamanho: qsaBlob.size,
        baixado_em: new Date().toISOString(),
      });
    }
  }

  console.log(`\n✅ ${documentos.length} documentos baixados e salvos!\n`);
  return documentos;
}

/**
 * Listar documentos de uma empresa no Storage
 */
export async function listDocuments(cnpj: string): Promise<DocumentInfo[]> {
  const sanitized = cnpj.replace(/\D/g, '');

  try {
    // Tentar buscar do DB primeiro
    const { data: dbDocs, error } = await supabase
      .from('empresa_documentos')
      .select('*')
      .eq('cnpj', sanitized);

    if (!error && dbDocs && dbDocs.length > 0) {
      return dbDocs.map(doc => ({
        cnpj: sanitized,
        tipo: doc.tipo_documento,
        url: doc.url_storage,
        tamanho: doc.tamanho_bytes,
        baixado_em: doc.baixado_em,
      }));
    }

    // Fallback: Listar diretamente do Storage
    const { data: files } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(sanitized);

    if (!files || files.length === 0) {
      return [];
    }

    return files.map(file => {
      const tipo = file.name.replace('.pdf', '') as 'cartao-cnpj' | 'qsa' | 'certidao';
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(`${sanitized}/${file.name}`);

      return {
        cnpj: sanitized,
        tipo,
        url: urlData.publicUrl,
        tamanho: file.metadata?.size || 0,
        baixado_em: file.created_at || '',
      };
    });

  } catch (error) {
    console.error('❌ Erro ao listar documentos:', error);
    return [];
  }
}

/**
 * Verificar se documentos já foram baixados
 */
export async function hasDocuments(cnpj: string): Promise<boolean> {
  const docs = await listDocuments(cnpj);
  return docs.length > 0;
}

/**
 * Obter URL de um documento específico
 */
export async function getDocumentURL(
  cnpj: string,
  tipo: 'cartao-cnpj' | 'qsa' | 'certidao'
): Promise<string | null> {
  const sanitized = cnpj.replace(/\D/g, '');
  const filePath = `${sanitized}/${tipo}.pdf`;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  // Verificar se arquivo existe
  const { data: fileData, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(sanitized, {
      search: `${tipo}.pdf`,
    });

  if (error || !fileData || fileData.length === 0) {
    return null;
  }

  return data.publicUrl;
}

/**
 * Deletar todos documentos de uma empresa
 */
export async function deleteDocuments(cnpj: string): Promise<boolean> {
  const sanitized = cnpj.replace(/\D/g, '');

  try {
    // Listar arquivos
    const { data: files } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(sanitized);

    if (!files || files.length === 0) {
      return true;
    }

    // Deletar todos arquivos
    const filePaths = files.map(f => `${sanitized}/${f.name}`);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(filePaths);

    if (error) {
      console.error('❌ Erro ao deletar documentos:', error);
      return false;
    }

    // Deletar registros do DB
    await supabase.from('empresa_documentos').delete().eq('cnpj', sanitized);

    console.log(`✅ Documentos de ${sanitized} deletados`);
    return true;

  } catch (error) {
    console.error('❌ Erro ao deletar documentos:', error);
    return false;
  }
}
