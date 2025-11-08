import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapProfileToTeamMember } from '../utils/formatters';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  const { id } = request.query;
  const profileId = Array.isArray(id) ? id[0] : id;

  if (!profileId) {
    response.status(400).json({ message: 'ID do membro inválido.' });
    return;
  }

  try {
    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        response.status(404).json({ message: 'Membro não encontrado.' });
        return;
      }

      response.status(200).json(mapProfileToTeamMember(data));
      return;
    }

    if (request.method === 'PATCH') {
      const { status } = request.body ?? {};

      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', profileId)
        .select('*')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        response.status(404).json({ message: 'Membro não encontrado.' });
        return;
      }

      response.status(200).json(mapProfileToTeamMember(data));
      return;
    }

    response.status(405).json({ message: 'Method not allowed' });
  } catch (err: any) {
    console.error('Error in team detail API:', err);
    response.status(500).json({ message: err.message ?? 'Internal server error' });
  }
}
