import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EMPRESA_SELECT, mapEmpresaRecord } from './prospects.ts';

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

const mapRedeDeVinculos = (records: any[]) => {
  const bySocio = new Map<string, { socio_nome: string; vinculos: any[] }>();

  records.forEach((record) => {
    const socioId = record.socio_cpf_parcial ?? record.socio?.cpf_parcial;
    const socioNome = record.socio?.nome_socio ?? 'Sócio não identificado';
    const empresa = record.empresas ?? {};
    const empresaNome = empresa.nome_fantasia || empresa.razao_social || record.empresa_cnpj;

    if (!socioId || !empresaNome) {
      return;
    }

    const percentual = Number(record.percentual_capital ?? 0);
    const grau = percentual >= 50 ? 1 : percentual >= 20 ? 2 : 3;

    const bucket = bySocio.get(socioId) ?? {
      socio_nome: socioNome,
      vinculos: [],
    };

    bucket.vinculos.push({
      empresa_vinculada_cnpj: empresa.cnpj ?? record.empresa_cnpj ?? '',
      empresa_vinculada_nome: empresaNome,
      grau_vinculo: grau,
      tipo_vinculo: 'direto',
    });

    bySocio.set(socioId, bucket);
  });

  return Array.from(bySocio.values()).filter((item) => item.vinculos.length > 0);
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

      const networkData = mapRedeDeVinculos(data ?? []);
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

      const territorialData = (data ?? [])
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

      const indicacoes = data ?? [];
      const indicacoesConvertidas = indicacoes.filter((item) =>
        (item.status ?? '').toLowerCase() === 'convertido',
      ).length;
      const totalGanho = indicacoes.reduce(
        (acc, item) => acc + Number(item.recompensa_ganha ?? 0),
        0,
      );

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
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    const message = error?.message ?? 'Internal server error';
    console.error('Error in reports API:', error);
    response.status(status).json({ message });
  }
}