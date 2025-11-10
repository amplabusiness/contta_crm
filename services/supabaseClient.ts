/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  // Reutiliza o cliente durante HMR e em ambientes de teste.
   
  var __supabaseClient__: SupabaseClient | undefined;
}

const resolveEnvValue = (key: string): string | undefined => {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? undefined)
      : undefined;

  if (metaEnv && key in metaEnv && metaEnv[key]) {
    return metaEnv[key];
  }

  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }

  return undefined;
};

const supabaseUrl = resolveEnvValue('VITE_SUPABASE_URL');
const supabaseAnonKey = resolveEnvValue('VITE_SUPABASE_ANON_KEY');

// Debug: verificar se as variáveis foram carregadas
console.log('🔧 Supabase Config:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
  anonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
});

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    supabaseUrl ? undefined : 'VITE_SUPABASE_URL',
    supabaseAnonKey ? undefined : 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean);

  console.error(
    `❌ Supabase não configurado: defina ${missing.join(', ')} no .env.local ou nas variáveis do ambiente de build.`,
  );
}

const client =
  globalThis.__supabaseClient__ ??
  createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

if (!globalThis.__supabaseClient__) {
  globalThis.__supabaseClient__ = client;
}

export const supabase = client;

