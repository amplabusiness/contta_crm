import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_lib/auth.ts';

const toHttpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

const httpCorsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-Requested-With, X-Api-Version',
};

const mapProfileRecord = (profile: any) => ({
  id: profile.id,
  name: profile.name ?? '',
  email: profile.email ?? '',
  role: profile.role ?? 'User',
  status: profile.status ?? 'Ativo',
  lastLogin: profile.last_login ?? null,
  emailUsageGB:
    typeof profile.email_usage_gb === 'number'
      ? profile.email_usage_gb
      : Number(profile.email_usage_gb ?? 0) || 0,
});

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  Object.entries(httpCorsHeaders).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  // CORS headers
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  try {
    const user = await requireUser(request, supabase);

    if (request.method !== 'GET' && user.user_metadata?.role !== 'Admin') {
      throw toHttpError(403, 'Permissões insuficientes para alterar membros da equipe.');
    }

    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, status, last_login, email_usage_gb')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      response.status(200).json((data ?? []).map(mapProfileRecord));
      return;
    }

    if (request.method === 'POST') {
      const { name, email, role, status, emailUsageGB, lastLogin } = request.body ?? {};

      if (!name || typeof name !== 'string') {
        throw toHttpError(400, 'Campo name é obrigatório.');
      }
      if (!email || typeof email !== 'string') {
        throw toHttpError(400, 'Campo email é obrigatório.');
      }

      const payload = {
        name,
        email,
        role: role ?? 'User',
        status: status ?? 'Ativo',
        email_usage_gb:
          emailUsageGB !== undefined && emailUsageGB !== null
            ? Number(emailUsageGB)
            : 0,
        last_login: lastLogin ?? null,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(payload)
        .select('id, name, email, role, status, last_login, email_usage_gb')
        .single();

      if (error) {
        throw error;
      }

      response.status(201).json(mapProfileRecord(data));
      return;
    }

    if (request.method === 'PATCH') {
      const { id } = request.query;
      if (!id || Array.isArray(id)) {
        throw toHttpError(400, 'ID do membro inválido.');
      }

      const updates = request.body ?? {};
      const mappedUpdates: Record<string, unknown> = {};

      if (updates.name !== undefined) {
        mappedUpdates.name = updates.name;
      }
      if (updates.role !== undefined) {
        mappedUpdates.role = updates.role;
      }
      if (updates.status !== undefined) {
        mappedUpdates.status = updates.status;
      }
      if (updates.emailUsageGB !== undefined) {
        mappedUpdates.email_usage_gb = Number(updates.emailUsageGB);
      }
      if (updates.lastLogin !== undefined) {
        mappedUpdates.last_login = updates.lastLogin;
      }

      const { data, error, status: dbStatus } = await supabase
        .from('profiles')
        .update(mappedUpdates)
        .eq('id', id)
        .select('id, name, email, role, status, last_login, email_usage_gb')
        .maybeSingle();

      if (error) {
        throw dbStatus === 406 ? toHttpError(404, 'Membro não encontrado.') : error;
      }

      if (!data) {
        throw toHttpError(404, 'Membro não encontrado.');
      }

      response.status(200).json(mapProfileRecord(data));
      return;
    }

    if (request.method === 'DELETE') {
      const { id } = request.query;
      if (!id || Array.isArray(id)) {
        throw toHttpError(400, 'ID do membro inválido.');
      }

      const { error, status: dbStatus } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        throw dbStatus === 406 ? toHttpError(404, 'Membro não encontrado.') : error;
      }

      response.status(204).end();
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (rawError: any) {
    const error = rawError ?? {};
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error.message || 'Internal server error';
    console.error('Error in team API:', error);
    response.status(status).json({ message });
  }
}

