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
  'Access-Control-Allow-Methods': 'PATCH,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const normalizeDate = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }

  return null;
};

const sanitizeCpf = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const digits = value.replace(/\D+/g, '');

  return digits.length === 11 ? digits : null;
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
    if (request.method === 'PATCH') {
      const { cpfParcial, dataNascimento, nomeSocio, cpfCompleto } = request.body ?? {};

      if (typeof cpfParcial !== 'string' || !cpfParcial.trim()) {
        throw toHttpError(400, 'cpfParcial é obrigatório.');
      }

      const sanitizedCpf = cpfParcial.trim();
      const normalizedDate = normalizeDate(dataNascimento);
      const normalizedCpfCompleto = sanitizeCpf(cpfCompleto);

      if (dataNascimento && normalizedDate === null) {
        throw toHttpError(400, 'Formato de data de nascimento inválido. Use AAAA-MM-DD.');
      }

      if (cpfCompleto && normalizedCpfCompleto === null) {
        throw toHttpError(400, 'CPF completo inválido. Informe 11 dígitos.');
      }

      const { data: updated, error: updateError } = await supabase
        .from('socios')
        .update({
          data_nascimento: normalizedDate,
          cpf_completo: normalizedCpfCompleto,
        })
        .eq('cpf_parcial', sanitizedCpf)
        .select('cpf_parcial, nome_socio, data_nascimento, cpf_completo')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (updated) {
        response.status(200).json(updated);
        return;
      }

      if (typeof nomeSocio !== 'string' || !nomeSocio.trim()) {
        throw toHttpError(404, 'Sócio não encontrado. Informe nomeSocio para criar o registro.');
      }

      const { data: inserted, error: insertError } = await supabase
        .from('socios')
        .insert({
          cpf_parcial: sanitizedCpf,
          nome_socio: nomeSocio.trim(),
          data_nascimento: normalizedDate,
          cpf_completo: normalizedCpfCompleto,
        })
        .select('cpf_parcial, nome_socio, data_nascimento, cpf_completo')
        .single();

      if (insertError) {
        throw insertError;
      }

      response.status(200).json(inserted);
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: unknown) {
    const error = (rawError ?? {}) as { status?: number; message?: string };
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in socios API:', rawError);
    response.status(status).json({ message });
  }
}
