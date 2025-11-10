import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const CNPJA_API_KEY = process.env.CNPJA_API_KEY || process.env.VITE_CNPJA_API_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

/**
 * Estrutura do CNPJ (14 dígitos):
 * 
 * XX.XXX.XXX/YYYY-ZZ
 * ^^^^^^^^^ ^^^^ ^^
 * |         |    |
 * |         |    +-- Dígitos Verificadores (2 dígitos)
 * |         +------- Ordem (4 dígitos): 0001=Matriz, 0002+=Filiais
 * +----------------- CNPJ Raiz (8 dígitos): Identifica o grupo empresarial
 * 
 * Exemplos:
 * - 12.345.678/0001-90 (Matriz)
 * - 12.345.678/0002-71 (Filial 1)
 * - 12.345.678/0003-52 (Filial 2)
 * 
 * API Endpoint: Buscar Matriz e Filiais
 * 
 * GET /api/cnpj-find-group?cnpj=12345678000190
 * 
 * Retorna:
 * {
 *   success: true,
 *   cnpjRaiz: "12345678",
 *   matriz: { cnpj: "12345678000190", razao_social: "...", ... },
 *   filiais: [
 *     { cnpj: "12345678000271", razao_social: "...", ordem: "0002", ... },
 *     { cnpj: "12345678000352", razao_social: "...", ordem: "0003", ... }
 *   ],
 *   totalEmpresas: 3,
 *   fromCache: true/false
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cnpj } = req.query;

    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'CNPJ não fornecido' 
      });
    }

    const cnpjClean = cnpj.replace(/\D/g, '');

    if (cnpjClean.length !== 14) {
      return res.status(400).json({ 
        success: false, 
        error: 'CNPJ inválido (deve ter 14 dígitos)' 
      });
    }

    // ========================================
    // EXTRAIR CNPJ RAIZ (8 primeiros dígitos)
    // ========================================
    const cnpjRaiz = cnpjClean.substring(0, 8);
    const ordem = cnpjClean.substring(8, 12); // 0001, 0002, etc.
    const isMatriz = ordem === '0001';

    console.log(`🔍 Buscando grupo empresarial: CNPJ Raiz ${cnpjRaiz}`);
    console.log(`   CNPJ fornecido: ${cnpjClean} (${isMatriz ? 'Matriz' : `Filial ${ordem}`})`);

    // ========================================
    // 1. VERIFICAR CACHE NO SUPABASE
    // ========================================
    // Buscar todas as empresas com o mesmo CNPJ raiz
    const { data: empresasCache, error: cacheError } = await supabase
      .from('empresas')
      .select('*')
      .like('cnpj', `${cnpjRaiz}%`)
      .order('cnpj');

    let empresasEncontradas = empresasCache || [];
    let fromCache = true;

    // Verificar se há dados em cache
    if (!cacheError && empresasEncontradas.length > 0) {
      console.log(`📦 Encontradas ${empresasEncontradas.length} empresas no cache Supabase`);

      // Verificar idade do cache da matriz
      const matriz = empresasEncontradas.find(e => e.cnpj.substring(8, 12) === '0001');
      
      if (matriz) {
        const dataAtualizacao = new Date(matriz.updated_at || matriz.created_at);
        const idade = Date.now() - dataAtualizacao.getTime();
        const maxIdade = 90 * 24 * 60 * 60 * 1000; // 90 dias

        if (idade < maxIdade) {
          console.log('✅ Cache válido (<90 dias), usando dados armazenados');
        } else {
          console.log('⚠️ Cache expirado (>90 dias), buscando atualização...');
          fromCache = false;
        }
      } else {
        console.log('⚠️ Matriz não encontrada no cache, buscando na CNPJá...');
        fromCache = false;
      }
    } else {
      console.log('⚠️ Nenhuma empresa encontrada no cache');
      fromCache = false;
    }

    // ========================================
    // 2. BUSCAR NA API CNPJá (se necessário)
    // ========================================
    if (!fromCache || empresasEncontradas.length === 0) {
      console.log('🌐 Consultando API CNPJá para descobrir filiais...');

      try {
        // Buscar empresa fornecida primeiro (pode ser matriz ou filial)
        const cnpjaResponse = await fetch(
          `https://api.cnpja.com/office/${cnpjClean}`,
          {
            headers: {
              'Authorization': CNPJA_API_KEY!
            }
          }
        );

        if (!cnpjaResponse.ok) {
          throw new Error(`Erro CNPJá: ${cnpjaResponse.status}`);
        }

        const empresaPrincipal = await cnpjaResponse.json();

        console.log(`✅ Empresa principal encontrada: ${empresaPrincipal.name}`);

        // Buscar outras empresas do mesmo grupo usando API de busca
        // Endpoint: /companies?taxId=12345678 (busca por CNPJ raiz)
        const grupoResponse = await fetch(
          `https://api.cnpja.com/companies?taxId=${cnpjRaiz}`,
          {
            headers: {
              'Authorization': CNPJA_API_KEY!
            }
          }
        );

        let todasEmpresas = [empresaPrincipal];

        if (grupoResponse.ok) {
          const grupoData = await grupoResponse.json();
          
          if (grupoData.companies && Array.isArray(grupoData.companies)) {
            console.log(`📊 Encontradas ${grupoData.companies.length} empresas no grupo`);
            
            // Adicionar empresas do grupo (exceto a principal já buscada)
            for (const empresa of grupoData.companies) {
              if (empresa.taxId !== cnpjClean) {
                // Buscar dados completos de cada filial
                try {
                  const filialResponse = await fetch(
                    `https://api.cnpja.com/office/${empresa.taxId}`,
                    {
                      headers: {
                        'Authorization': CNPJA_API_KEY!
                      }
                    }
                  );

                  if (filialResponse.ok) {
                    const filialData = await filialResponse.json();
                    todasEmpresas.push(filialData);
                  }

                  // Rate limit: aguardar 1s entre requests
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                } catch (err) {
                  console.error(`⚠️ Erro ao buscar filial ${empresa.taxId}:`, err);
                }
              }
            }
          }
        }

        console.log(`💾 Salvando ${todasEmpresas.length} empresas no Supabase...`);

        // Salvar todas as empresas encontradas
        empresasEncontradas = [];
        
        for (const empresaData of todasEmpresas) {
          const empresaFormatada = {
            cnpj: empresaData.taxId,
            razao_social: empresaData.name,
            nome_fantasia: empresaData.alias || null,
            cnae_principal: empresaData.mainActivity?.id?.toString() || null,
            descricao_cnae: empresaData.mainActivity?.text || null,
            natureza_juridica: empresaData.nature?.text || null,
            porte_empresa: empresaData.size?.acronym || null,
            capital_social: empresaData.capital || null,
            data_abertura: empresaData.founded || null,
            situacao_cadastral: empresaData.status?.text || null,
            endereco: empresaData.address ? {
              logradouro: empresaData.address.street,
              numero: empresaData.address.number,
              complemento: empresaData.address.details,
              bairro: empresaData.address.district,
              municipio: empresaData.address.city,
              uf: empresaData.address.state,
              cep: empresaData.address.zip
            } : null,
            telefone: empresaData.phones?.[0] ? 
              `(${empresaData.phones[0].area}) ${empresaData.phones[0].number}` : null,
            email: empresaData.emails?.[0]?.address || null,
            updated_at: new Date().toISOString()
          };

          // Upsert no Supabase
          const { data: empresaSalva, error: saveError } = await supabase
            .from('empresas')
            .upsert(empresaFormatada, { onConflict: 'cnpj' })
            .select()
            .single();

          if (saveError) {
            console.error(`❌ Erro ao salvar empresa ${empresaData.taxId}:`, saveError);
          } else {
            empresasEncontradas.push(empresaSalva);
          }
        }

        fromCache = false;

      } catch (error) {
        console.error('❌ Erro ao buscar grupo na CNPJá:', error);
        
        // Se falhar, usar cache mesmo que vazio
        if (empresasEncontradas.length === 0) {
          return res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados na CNPJá',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
    }

    // ========================================
    // 3. SEPARAR MATRIZ E FILIAIS
    // ========================================
    const matriz = empresasEncontradas.find(e => e.cnpj.substring(8, 12) === '0001');
    const filiais = empresasEncontradas
      .filter(e => e.cnpj.substring(8, 12) !== '0001')
      .map(f => ({
        ...f,
        ordem: f.cnpj.substring(8, 12),
        ordemNumero: parseInt(f.cnpj.substring(8, 12))
      }))
      .sort((a, b) => a.ordemNumero - b.ordemNumero);

    console.log(`✅ Grupo empresarial encontrado:`);
    console.log(`   Matriz: ${matriz?.razao_social || 'Não encontrada'}`);
    console.log(`   Filiais: ${filiais.length}`);

    // ========================================
    // 4. RETORNAR RESPOSTA
    // ========================================
    return res.status(200).json({
      success: true,
      cnpjRaiz,
      cnpjFornecido: cnpjClean,
      isMatriz,
      matriz: matriz ? {
        cnpj: matriz.cnpj,
        razao_social: matriz.razao_social,
        nome_fantasia: matriz.nome_fantasia,
        cnae_principal: matriz.cnae_principal,
        descricao_cnae: matriz.descricao_cnae,
        porte_empresa: matriz.porte_empresa,
        situacao_cadastral: matriz.situacao_cadastral,
        endereco: matriz.endereco,
        telefone: matriz.telefone,
        email: matriz.email,
        data_abertura: matriz.data_abertura
      } : null,
      filiais: filiais.map(f => ({
        cnpj: f.cnpj,
        razao_social: f.razao_social,
        nome_fantasia: f.nome_fantasia,
        ordem: f.ordem,
        situacao_cadastral: f.situacao_cadastral,
        endereco: f.endereco,
        telefone: f.telefone,
        email: f.email
      })),
      totalEmpresas: empresasEncontradas.length,
      totalFiliais: filiais.length,
      fromCache,
      metadata: {
        estrutura: 'XX.XXX.XXX/YYYY-ZZ',
        cnpjRaiz: 'Primeiros 8 dígitos (identifica grupo)',
        ordem: 'Dígitos 9-12 (0001=Matriz, 0002+=Filiais)',
        verificadores: 'Últimos 2 dígitos (validação)'
      }
    });

  } catch (error) {
    console.error('❌ Erro no handler:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
