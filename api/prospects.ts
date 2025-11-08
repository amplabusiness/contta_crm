import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    if (request.method === 'GET') {
      // Retorna apenas os CNPJs das empresas (para compatibilidade com o frontend atual)
      const { data, error } = await supabase
        .from('empresas')
        .select('cnpj')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const cnpjs = data?.map(e => e.cnpj) || [];
      response.status(200).json(cnpjs);
    } else if (request.method === 'POST') {
      // Criar ou atualizar empresa
      const empresa = request.body;

      const { data, error } = await supabase
        .from('empresas')
        .upsert({
          cnpj: empresa.cnpj,
          razao_social: empresa.razao_social,
          nome_fantasia: empresa.nome_fantasia,
          situacao_cadastral: empresa.situacao_cadastral,
          data_abertura: empresa.data_abertura,
          porte: empresa.porte,
          logradouro: empresa.endereco_principal?.logradouro,
          numero: empresa.endereco_principal?.numero,
          bairro: empresa.endereco_principal?.bairro,
          cidade: empresa.endereco_principal?.cidade,
          uf: empresa.endereco_principal?.uf,
          cep: empresa.endereco_principal?.cep,
          latitude: empresa.endereco_principal?.latitude,
          longitude: empresa.endereco_principal?.longitude,
          cnae_principal_codigo: empresa.cnae_principal?.codigo,
          cnae_principal_descricao: empresa.cnae_principal?.descricao,
          telefones: empresa.telefones || [],
          emails: empresa.emails || []
        }, {
          onConflict: 'cnpj'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Inserir sócios se fornecidos
      if (empresa.quadro_socios && empresa.quadro_socios.length > 0) {
        for (const socio of empresa.quadro_socios) {
          // Inserir sócio
          await supabase
            .from('socios')
            .upsert({
              cpf_parcial: socio.cpf_parcial,
              nome_socio: socio.nome_socio
            }, {
              onConflict: 'cpf_parcial'
            });

          // Criar relação empresa-sócio
          await supabase
            .from('empresa_socios')
            .upsert({
              empresa_cnpj: empresa.cnpj,
              socio_cpf_parcial: socio.cpf_parcial,
              qualificacao: socio.qualificacao,
              percentual_capital: socio.percentual_capital
            }, {
              onConflict: 'empresa_cnpj,socio_cpf_parcial'
            });
        }
      }

      response.status(200).json(data);
    } else {
      response.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in prospects API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

