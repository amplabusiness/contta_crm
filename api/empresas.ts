import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapEmpresaRecordToResponse } from './utils/formatters';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const selectColumns = `
  cnpj,
  razao_social,
  nome_fantasia,
  situacao_cadastral,
  data_abertura,
  porte,
  logradouro,
  numero,
  bairro,
  cidade,
  uf,
  cep,
  latitude,
  longitude,
  cnae_principal_codigo,
  cnae_principal_descricao,
  telefones,
  emails,
  empresa_socios (
    qualificacao,
    percentual_capital,
    socio:socios (
      cpf_parcial,
      nome_socio
    )
  )
`;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('empresas')
      .select(selectColumns)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const empresas = (data ?? []).map(mapEmpresaRecordToResponse);
    response.status(200).json(empresas);
  } catch (err: any) {
    console.error('Error in empresas API:', err);
    response.status(500).json({ message: err.message ?? 'Internal server error' });
  }
}
