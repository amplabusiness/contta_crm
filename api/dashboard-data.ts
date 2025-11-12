import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  computeDashboardMetrics,
  type DealRecord,
  type TaskRecord,
} from '../services/dashboardMetrics.ts';

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
    const [dealsResult, tasksResult] = await Promise.all([
      supabase
        .from('deals')
        .select('id, company_name, value, stage, probability, expected_close_date, last_activity, created_at')
        .order('created_at', { ascending: false })
        .limit(400),
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, created_at, related_deal_name')
        .order('created_at', { ascending: false })
        .limit(400),
    ]);

    if (dealsResult.error) {
      throw dealsResult.error;
    }
    if (tasksResult.error) {
      throw tasksResult.error;
    }

    const deals = (dealsResult.data ?? []) as DealRecord[];
    const tasks = (tasksResult.data ?? []) as TaskRecord[];

    const metrics = computeDashboardMetrics(deals, tasks);

    let insightsHtml: string | null = null;
    // DEPRECATED: Use novo endpoint /api/analytics-report
    // const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    // if (geminiKey) {
    //   if (!process.env.API_KEY) {
    //     process.env.API_KEY = geminiKey;
    //   }
    //   try {
    //     insightsHtml = await generateAutomatedReport({...});
    //   } catch (geminiError: any) {
    //     console.warn('Falha ao gerar insights com Gemini:', geminiError?.message ?? geminiError);
    //   }
    // }

    response.status(200).json({
      ...metrics,
      insightsHtml,
    });
  } catch (rawError: unknown) {
    const fallback = (rawError ?? {}) as { status?: number; message?: string };
    const status = typeof fallback.status === 'number' ? fallback.status : 500;
    const message = fallback.message || 'Internal server error';
    console.error('Error in dashboard-data API:', rawError);
    response.status(status).json({ message });
  }
}

