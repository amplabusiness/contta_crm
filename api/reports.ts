import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EMPRESA_SELECT, mapEmpresaRecord } from './prospects.ts';

type NullableString = string | null;
type EmpresaRawRecord = Parameters<typeof mapEmpresaRecord>[0];

interface NetworkLink {
  empresa_vinculada_cnpj: string;
  empresa_vinculada_nome: string;
  grau_vinculo: 1 | 2 | 3;
  tipo_vinculo: 'direto';
}

interface NetworkBucket {
  socio_nome: string;
  vinculos: NetworkLink[];
}

interface IndicacaoRecord {
  id: string;
  empresa_nome: NullableString;
  status: NullableString;
  data_indicacao: NullableString;
  recompensa_ganha: number;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const determineNivel = (indicacoesConvertidas: number, totalGanho: number) => {
  if (indicacoesConvertidas >= 12 || totalGanho >= 20000) {
    return 'Platina' as const;
  }
  if (indicacoesConvertidas >= 8 || totalGanho >= 12000) {
    return 'Ouro' as const;
  }
  if (indicacoesConvertidas >= 4 || totalGanho >= 6000) {
    return 'Prata' as const;
  }
  return 'Bronze' as const;
};

const metaPorNivel: Record<'Bronze' | 'Prata' | 'Ouro' | 'Platina', number> = {
  Bronze: 4,
  Prata: 8,
  Ouro: 12,
  Platina: 16,
};

const beneficioPorNivel: Record<'Bronze' | 'Prata' | 'Ouro' | 'Platina', string> = {
  Bronze: 'Cashback de 5% em indicações convertidas.',
  Prata: 'Bônus de 10% em cada nova conversão.',
  Ouro: 'Recompensa 15% maior em todas as indicações.',
  Platina: '20% adicional e acesso a leads exclusivos do programa.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const sanitizeNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

const mapRedeDeVinculos = (records: unknown[]): NetworkBucket[] => {
  const bySocio = new Map<string, NetworkBucket>();

  records.forEach((record) => {
    if (!isRecord(record)) {
      return;
    }

    const socioRelation = isRecord(record.socio) ? record.socio : null;
    const empresaRelation = isRecord(record.empresas) ? record.empresas : null;

    const socioIdCandidate = record.socio_cpf_parcial ?? socioRelation?.cpf_parcial;
    const socioId = sanitizeString(socioIdCandidate);
    if (!socioId) {
      return;
    }

    const socioNomeCandidate = socioRelation?.nome_socio;
    const socioNome = sanitizeString(socioNomeCandidate) ?? 'Sócio não identificado';

    const empresaNomeCandidate =
      empresaRelation?.nome_fantasia ?? empresaRelation?.razao_social ?? record.empresa_cnpj;
    const empresaNome = sanitizeString(empresaNomeCandidate);
    if (!empresaNome) {
      return;
    }

    const empresaCnpjCandidate = empresaRelation?.cnpj ?? record.empresa_cnpj;
    const empresaCnpj = typeof empresaCnpjCandidate === 'string' ? empresaCnpjCandidate : '';

    const percentual = sanitizeNumber(record.percentual_capital) ?? 0;
    const grau: 1 | 2 | 3 = percentual >= 50 ? 1 : percentual >= 20 ? 2 : 3;

    const bucket = bySocio.get(socioId) ?? { socio_nome: socioNome, vinculos: [] };
    if (!bySocio.has(socioId)) {
      bySocio.set(socioId, bucket);
    } else if (bucket.socio_nome === 'Sócio não identificado' && socioNome !== 'Sócio não identificado') {
      bucket.socio_nome = socioNome;
    }

    bucket.vinculos.push({
      empresa_vinculada_cnpj: empresaCnpj,
      empresa_vinculada_nome: empresaNome,
      grau_vinculo: grau,
      tipo_vinculo: 'direto',
    });
  });

  return Array.from(bySocio.values()).filter((item) => item.vinculos.length > 0);
};

const normalizeIndicacoes = (records: unknown[]): IndicacaoRecord[] =>
  records
    .map((entry): IndicacaoRecord | null => {
      if (!isRecord(entry)) {
        return null;
      }

      const idRaw = entry.id;
      if (idRaw === undefined || idRaw === null) {
        return null;
      }

      const recompensa = sanitizeNumber(entry.recompensa_ganha) ?? 0;

      return {
        id: typeof idRaw === 'string' ? idRaw : String(idRaw),
        empresa_nome: sanitizeString(entry.empresa_nome),
        status: sanitizeString(entry.status),
        data_indicacao: sanitizeString(entry.data_indicacao),
        recompensa_ganha: recompensa,
      };
    })
    .filter((indicacao): indicacao is IndicacaoRecord => indicacao !== null);

const extractErrorDetails = (
  error: unknown,
): { status: number; message: string; original: unknown } => {
  if (error instanceof Error) {
    const status = isRecord(error) && typeof error.status === 'number' ? error.status : 500;
    return { status, message: error.message, original: error };
  }

  if (isRecord(error)) {
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = typeof error.message === 'string' ? error.message : 'Internal server error';
    return { status, message, original: error };
  }

  return { status: 500, message: 'Internal server error', original: error };
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

  if (request.method !== 'GET') {
    response.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const typeRaw = request.query.type;
  const type = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;

  try {
    if (!type || type === 'network') {
      const { data, error } = await supabase
        .from('empresa_socios')
        .select(
          `
          socio_cpf_parcial,
          empresa_cnpj,
          percentual_capital,
          empresas:empresa_cnpj ( cnpj, razao_social, nome_fantasia ),
          socio:socio_cpf_parcial ( cpf_parcial, nome_socio )
        `,
        )
        .limit(500);

      if (error) {
        throw error;
      }

      const networkData = mapRedeDeVinculos((data ?? []) as unknown[]);
      response.status(200).json({ networkData });
      return;
    }

    if (type === 'territorial') {
      const { data, error } = await supabase
        .from('empresas')
        .select(EMPRESA_SELECT)
        .limit(200);

      if (error) {
        throw error;
      }

      const territorialData = ((data ?? []) as EmpresaRawRecord[])
        .map(mapEmpresaRecord)
        .filter((empresa) => empresa.situacao_cadastral === 'Ativa')
        .map((empresa) => ({
          cnpj: empresa.cnpj,
          razao_social: empresa.razao_social,
          nome_fantasia: empresa.nome_fantasia,
          situacao_cadastral: empresa.situacao_cadastral,
          data_abertura: empresa.data_abertura,
          porte: empresa.porte,
          endereco_principal: empresa.endereco_principal,
          cnae_principal: empresa.cnae_principal,
        }));

      response.status(200).json({ territorialData });
      return;
    }

    if (type === 'performance') {
      const { data, error } = await supabase
        .from('indicacoes')
        .select('id, empresa_nome, status, data_indicacao, recompensa_ganha')
        .order('data_indicacao', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      const indicacoes = normalizeIndicacoes((data ?? []) as unknown[]);
      const indicacoesConvertidas = indicacoes.filter((item) =>
        (item.status ?? '').toLowerCase() === 'convertido',
      ).length;
      const totalGanho = indicacoes.reduce((acc, item) => acc + item.recompensa_ganha, 0);

      const nivel = determineNivel(indicacoesConvertidas, totalGanho);
      const metaProximoNivel = metaPorNivel[nivel];
      const beneficioAtual = beneficioPorNivel[nivel];

      const performanceData = {
        status: {
          nivel,
          total_ganho: totalGanho,
          indicacoes_convertidas: indicacoesConvertidas,
          meta_proximo_nivel: metaProximoNivel,
          beneficio_atual: beneficioAtual,
        },
        indicacoes,
      };

      response.status(200).json({ performanceData });
      return;
    }

    response.status(400).json({ message: 'Tipo de relatório inválido.' });
  } catch (rawError: unknown) {
    const { status, message, original } = extractErrorDetails(rawError);
    console.error('Error in reports API:', original);
    response.status(status).json({ message });
  }
}