import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH');
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

      // Transformar dados para o formato esperado pelo frontend
      const teamMembers = data?.map(profile => ({
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        role: profile.role,
        status: profile.status || 'Ativo',
        lastLogin: profile.last_login ? new Date(profile.last_login).toLocaleDateString('pt-BR') : 'Nunca',
        emailUsageGB: parseFloat(profile.email_usage_gb) || 0
      })) || [];

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

      response.status(201).json(data);
    } else if (request.method === 'PATCH') {
      const { id } = request.query;
      const { status } = request.body;

      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      response.status(200).json(data);
    } else {
      response.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Error in team API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

