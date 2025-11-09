import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EMPRESA_SELECT, mapEmpresaRecord } from './prospects.ts';

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

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

const fetchCoordinatesForCep = async (cep: string) => {
  const sanitized = cep.replace(/[^\d]/g, '');
  if (sanitized.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${sanitized}`);
    if (!response.ok) {
      console.warn('BrasilAPI CEP lookup failed:', response.statusText);
      return null;
    }

    const payload = await response.json();
    const latitude = Number.parseFloat(payload?.location?.coordinates?.latitude);
    const longitude = Number.parseFloat(payload?.location?.coordinates?.longitude);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  } catch (error) {
    console.error('Failed to resolve CEP coordinates:', error);
  }

  return null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

const calcularRecompensa = (porte?: string | null) => {
  if (!porte) {
    return 750;
  }
  switch (porte) {
    case 'ME':
      return 600;
    case 'EPP':
      return 900;
    default:
      return 1200;
  }
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

  try {
    const sectionRaw = request.query.section;
    const section = Array.isArray(sectionRaw) ? sectionRaw[0] : sectionRaw;

    if (!section || section === 'status') {
      const { data, error } = await supabase
        .from('indicacoes')
        .select('status, recompensa_ganha');

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

      response.status(200).json({
        nivel,
        total_ganho: totalGanho,
        indicacoes_convertidas: indicacoesConvertidas,
        meta_proximo_nivel: metaProximoNivel,
        beneficio_atual: beneficioAtual,
      });
      return;
    }

    if (section === 'minhas') {
      const { data, error } = await supabase
        .from('indicacoes')
        .select('id, empresa_nome, status, data_indicacao, recompensa_ganha')
        .order('data_indicacao', { ascending: false });

      if (error) {
        throw error;
      }

      response.status(200).json(data ?? []);
      return;
    }

    if (section === 'sugestoes') {
      const cepRaw = request.query.cep;
      const cep = Array.isArray(cepRaw) ? cepRaw[0] : cepRaw;
      const originCoords = cep ? await fetchCoordinatesForCep(cep) : null;

      const { data, error } = await supabase
        .from('empresas')
        .select(EMPRESA_SELECT)
        .limit(120);

      if (error) {
        throw error;
      }

      const empresas = (data ?? [])
        .map(mapEmpresaRecord)
        .filter((empresa) => empresa.situacao_cadastral === 'Ativa');

      const enriched = empresas
        .map((empresa) => {
          let distancia_km: number | undefined;
          if (
            originCoords &&
            typeof empresa.endereco_principal.latitude === 'number' &&
            typeof empresa.endereco_principal.longitude === 'number'
          ) {
            distancia_km = calculateDistanceKm(
              originCoords.latitude,
              originCoords.longitude,
              empresa.endereco_principal.latitude,
              empresa.endereco_principal.longitude,
            );
          }

          return {
            ...empresa,
            distancia_km,
            recompensa: calcularRecompensa(empresa.porte),
          };
        })
        .filter((empresa) =>
          typeof empresa.distancia_km === 'number'
            ? empresa.distancia_km <= 15
            : true,
        )
        .sort((a, b) => {
          const distA = a.distancia_km ?? Number.POSITIVE_INFINITY;
          const distB = b.distancia_km ?? Number.POSITIVE_INFINITY;
          return distA - distB;
        })
        .slice(0, 20);

      response.status(200).json(enriched);
      return;
    }

    throw toHttpError(400, 'Seção solicitada inválida.');
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in indicacoes API:', error);
    response.status(status).json({ message });
  }
}
