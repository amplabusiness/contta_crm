import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

export const EMPRESA_SELECT = `
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
  documentos,
  empresa_socios (
    qualificacao,
    percentual_capital,
    socio:socio_cpf_parcial (
      cpf_parcial,
      nome_socio
    )
  )
`;

const sanitizeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const mapEmpresaRecord = (record: any) => ({
  cnpj: record.cnpj,
  razao_social: record.razao_social ?? '',
  nome_fantasia: record.nome_fantasia ?? '',
  situacao_cadastral: record.situacao_cadastral ?? 'Ativa',
  data_abertura: record.data_abertura ?? null,
  porte: record.porte ?? 'ME',
  endereco_principal: {
    logradouro: record.logradouro ?? '',
    numero: record.numero ?? '',
    bairro: record.bairro ?? '',
    cidade: record.cidade ?? '',
    uf: record.uf ?? '',
    cep: record.cep ?? '',
    latitude: sanitizeNumber(record.latitude) ?? undefined,
    longitude: sanitizeNumber(record.longitude) ?? undefined,
  },
  cnae_principal: {
    codigo: record.cnae_principal_codigo ?? '',
    descricao: record.cnae_principal_descricao ?? '',
  },
  quadro_socios: (record.empresa_socios ?? []).map((item: any) => ({
    nome_socio: item.socio?.nome_socio ?? '',
    cpf_parcial: item.socio?.cpf_parcial ?? '',
    qualificacao: item.qualificacao ?? '',
    percentual_capital: Number(item.percentual_capital ?? 0),
  })),
  telefones: record.telefones ?? [],
  emails: record.emails ?? [],
  documentos: record.documentos ?? [],
});

const upsertSocios = async (empresa: any) => {
  if (!empresa.quadro_socios || empresa.quadro_socios.length === 0) {
    return;
  }

  await Promise.all(
    empresa.quadro_socios.map(async (socio: any) => {
      await supabase
        .from('socios')
        .upsert(
          {
            cpf_parcial: socio.cpf_parcial,
            nome_socio: socio.nome_socio,
          },
          {
            onConflict: 'cpf_parcial',
          },
        );

      await supabase
        .from('empresa_socios')
        .upsert(
          {
            empresa_cnpj: empresa.cnpj,
            socio_cpf_parcial: socio.cpf_parcial,
            qualificacao: socio.qualificacao,
            percentual_capital: socio.percentual_capital,
          },
          {
            onConflict: 'empresa_cnpj,socio_cpf_parcial',
          },
        );
    }),
  );
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  Object.entries(httpCorsHeaders).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  try {
    if (request.method === 'GET') {
      const search = typeof request.query.search === 'string' ? request.query.search.trim() : undefined;
      const cnpjFilter = typeof request.query.cnpj === 'string' ? request.query.cnpj.replace(/[^0-9]/g, '') : undefined;
      const limitParam = request.query.limit;
      const offsetParam = request.query.offset;

      const limit = Math.min(
        Math.max(Number.parseInt(Array.isArray(limitParam) ? limitParam[0] : limitParam ?? '25', 10) || 25, 1),
        100,
      );
      const offset = Math.max(Number.parseInt(Array.isArray(offsetParam) ? offsetParam[0] : offsetParam ?? '0', 10) || 0, 0);

      let query = supabase
        .from('empresas')
        .select(EMPRESA_SELECT, { count: 'exact' })
        .order('razao_social', { ascending: true })
        .range(offset, offset + limit - 1);

      if (cnpjFilter) {
        query = query.eq('cnpj', cnpjFilter);
      } else if (search) {
        const sanitized = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
        query = query.or(
          `razao_social.ilike.%${sanitized}%,nome_fantasia.ilike.%${sanitized}%,cnpj.ilike.%${sanitized}%`,
        );
      }

      const { data, count, error } = await query;

      if (error) {
        throw error;
      }

      if (typeof count === 'number') {
        response.setHeader('X-Total-Count', String(count));
      }

      response.status(200).json((data ?? []).map(mapEmpresaRecord));
      return;
    }

    if (request.method === 'POST') {
      const empresa = request.body ?? {};

      if (!empresa.cnpj) {
        throw toHttpError(400, 'Campo cnpj é obrigatório.');
      }
      if (!empresa.razao_social) {
        throw toHttpError(400, 'Campo razao_social é obrigatório.');
      }

      const payload = {
        cnpj: empresa.cnpj.replace(/[^0-9]/g, ''),
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia ?? null,
        situacao_cadastral: empresa.situacao_cadastral ?? null,
        data_abertura: empresa.data_abertura ?? null,
        porte: empresa.porte ?? null,
        logradouro: empresa.endereco_principal?.logradouro ?? null,
        numero: empresa.endereco_principal?.numero ?? null,
        bairro: empresa.endereco_principal?.bairro ?? null,
        cidade: empresa.endereco_principal?.cidade ?? null,
        uf: empresa.endereco_principal?.uf ?? null,
        cep: empresa.endereco_principal?.cep ?? null,
        latitude: sanitizeNumber(empresa.endereco_principal?.latitude),
        longitude: sanitizeNumber(empresa.endereco_principal?.longitude),
        cnae_principal_codigo: empresa.cnae_principal?.codigo ?? null,
        cnae_principal_descricao: empresa.cnae_principal?.descricao ?? null,
        telefones: empresa.telefones ?? [],
        emails: empresa.emails ?? [],
        documentos: empresa.documentos ?? [],
      };

      const { data, error } = await supabase
        .from('empresas')
        .upsert(payload, {
          onConflict: 'cnpj',
          ignoreDuplicates: false,
        })
        .select(EMPRESA_SELECT)
        .single();

      if (error) {
        throw error;
      }

      await upsertSocios({ ...empresa, cnpj: payload.cnpj });

      let finalRecord = data;

      if (empresa.quadro_socios && empresa.quadro_socios.length > 0) {
        const { data: refreshed, error: refreshError } = await supabase
          .from('empresas')
          .select(EMPRESA_SELECT)
          .eq('cnpj', payload.cnpj)
          .single();

        if (!refreshError && refreshed) {
          finalRecord = refreshed;
        }
      }

      response.status(201).json(mapEmpresaRecord(finalRecord));
      return;
    }

    if (request.method === 'DELETE') {
      const cnpjParam = request.query.cnpj;
      const cnpj = typeof cnpjParam === 'string' ? cnpjParam.replace(/[^0-9]/g, '') : undefined;

      if (!cnpj) {
        throw toHttpError(400, 'Informe o cnpj a ser removido.');
      }

      const { error, status: dbStatus } = await supabase
        .from('empresas')
        .delete()
        .eq('cnpj', cnpj);

      if (error) {
        throw dbStatus === 406 ? toHttpError(404, 'Empresa não encontrada.') : error;
      }

      response.status(204).end();
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in prospects API:', error);
    response.status(status).json({ message });
  }
}

