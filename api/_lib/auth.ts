import type { VercelRequest } from '@vercel/node';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const toUnauthorized = (message: string) =>
  Object.assign(new Error(message), { status: 401 });

const extractBearerToken = (request: VercelRequest): string | null => {
  const headerValue = request.headers.authorization || request.headers.Authorization;
  if (typeof headerValue !== 'string') {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
};

export const requireUser = async (
  request: VercelRequest,
  adminClient: SupabaseClient,
): Promise<User> => {
  const token =
    extractBearerToken(request) ??
    (typeof request.cookies === 'object' ? request.cookies['sb-access-token'] : undefined) ??
    null;

  if (!token) {
    throw toUnauthorized('Credenciais ausentes. Faca login novamente.');
  }

  const { data, error } = await adminClient.auth.getUser(token);

  if (error || !data?.user) {
    throw toUnauthorized('Sessao invalida ou expirada. Faca login novamente.');
  }

  return data.user;
};
