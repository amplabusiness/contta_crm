import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapProfileToTeamMember } from '../utils/formatters';

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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const teamMembers = (data ?? []).map(mapProfileToTeamMember);

      response.status(200).json(teamMembers);
    } else if (request.method === 'POST') {
      const { name, email, role } = request.body;

      // Primeiro criar o usuário no auth (isso normalmente seria feito pelo frontend)
      // Por enquanto, apenas criar o perfil (assumindo que o usuário já existe no auth)
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          name,
          email,
          role: role || 'User',
          status: 'Ativo'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      response.status(201).json(mapProfileToTeamMember(data));
    } else {
      response.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in team API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

