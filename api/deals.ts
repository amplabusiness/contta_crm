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
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    if (request.method === 'GET') {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          empresas:empresa_cnpj (
            cnpj,
            razao_social,
            nome_fantasia
          ),
          profiles:owner_id (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transformar dados para o formato esperado pelo frontend
      const deals = data?.map(deal => ({
        id: deal.id,
        companyName: deal.company_name,
        contactName: deal.contact_name || '',
        contactEmail: deal.contact_email || '',
        value: parseFloat(deal.value),
        probability: deal.probability || 0,
        expectedCloseDate: deal.expected_close_date,
        lastActivity: deal.last_activity,
        stage: deal.stage,
        health: deal.health_score ? {
          score: deal.health_score,
          reasoning: deal.health_reasoning || '',
          suggestedAction: deal.health_suggested_action || ''
        } : null
      })) || [];

      response.status(200).json(deals);
    } else if (request.method === 'POST') {
      const {
        companyName,
        contactName,
        contactEmail,
        value,
        probability,
        stage,
        expectedCloseDate,
        empresaCnpj,
        ownerId
      } = request.body;

      const { data, error } = await supabase
        .from('deals')
        .insert({
          company_name: companyName,
          contact_name: contactName,
          contact_email: contactEmail,
          value,
          probability: probability || 0,
          stage,
          expected_close_date: expectedCloseDate,
          empresa_cnpj: empresaCnpj,
          owner_id: ownerId
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      response.status(201).json(data);
    } else if (request.method === 'PATCH') {
      const { id } = request.query;
      const updates = request.body;

      const { data, error } = await supabase
        .from('deals')
        .update(updates)
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
    console.error('Error in deals API:', error);
    response.status(500).json({ message: error.message || 'Internal server error' });
  }
}

