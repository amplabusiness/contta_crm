import type { PostgrestSingleResponse } from '@supabase/supabase-js';

export type SituacaoCadastral = 'Ativa' | 'Suspensa' | 'Baixada';
export type Porte = 'ME' | 'EPP' | 'Demais';

export interface EnderecoResponse {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  latitude?: number;
  longitude?: number;
}

export interface CNAEResponse {
  codigo: string;
  descricao: string;
}

export interface SocioResponse {
  nome_socio: string;
  cpf_parcial: string;
  qualificacao: string;
  percentual_capital: number;
}

export interface EmpresaResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: SituacaoCadastral;
  data_abertura: string;
  porte: Porte;
  endereco_principal: EnderecoResponse;
  cnae_principal: CNAEResponse;
  quadro_socios: SocioResponse[];
  telefones: string[];
  emails: string[];
  documentos: unknown[];
  distancia_km?: number;
}

export interface TaskResponse {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  description?: string | null;
  googleCalendarEventId?: string | null;
  relatedDealId: string;
  relatedDealName: string;
  createdAt: string;
}

export interface TeamMemberResponse {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  status: 'Ativo' | 'Inativo';
  lastLogin: string;
  emailUsageGB: number;
}

export const sanitizeCnpj = (cnpj: string): string => cnpj?.replace(/[^\d]/g, '') ?? '';

export const formatCnpj = (cnpj: string): string => {
  const digits = sanitizeCnpj(cnpj);
  if (digits.length !== 14) {
    return digits;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const normalizeSituacao = (situacao?: string | null): SituacaoCadastral => {
  const normalized = (situacao ?? '').trim().toLowerCase();
  if (normalized === 'suspensa') {
    return 'Suspensa';
  }
  if (normalized === 'baixada' || normalized === 'inativa') {
    return 'Baixada';
  }
  return 'Ativa';
};

const normalizePorte = (porte?: string | null): Porte => {
  const normalized = (porte ?? '').trim().toUpperCase();
  if (!normalized) {
    return 'Demais';
  }
  if (['ME', 'MEI', 'MICROEMPRESA', 'MICRO EMPRESA', 'MICRO EMPREENDEDOR INDIVIDUAL'].some(value => normalized.includes(value))) {
    return 'ME';
  }
  if (['EPP', 'PEQUENO', 'PEQUENA'].some(value => normalized.includes(value))) {
    return 'EPP';
  }
  return 'Demais';
};

const normalizeDate = (date?: string | null): string => {
  if (!date) {
    return new Date().toISOString().slice(0, 10);
  }
  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const ensureArray = <T>(value: T[] | T | null | undefined): T[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(item => item !== null && item !== undefined) as T[];
  }
  return [value as T];
};

export const mapEmpresaRecordToResponse = (record: any): EmpresaResponse => {
  const endereco: EnderecoResponse = {
    logradouro: record.logradouro ?? '',
    numero: record.numero ?? '',
    bairro: record.bairro ?? '',
    cidade: record.cidade ?? '',
    uf: record.uf ?? '',
    cep: record.cep ?? '',
    latitude: record.latitude ?? undefined,
    longitude: record.longitude ?? undefined,
  };

  const socios: SocioResponse[] = Array.isArray(record.empresa_socios)
    ? record.empresa_socios
        .map((entry: any) => {
          const socio = entry.socio ?? entry.socios ?? {};
          const nome = socio.nome_socio ?? '';
          if (!nome) {
            return null;
          }
          return {
            nome_socio: nome,
            cpf_parcial: sanitizeCnpj(socio.cpf_parcial ?? ''),
            qualificacao: entry.qualificacao ?? 'Sócio',
            percentual_capital: entry.percentual_capital ? Number(entry.percentual_capital) : 0,
          } as SocioResponse;
        })
        .filter(Boolean) as SocioResponse[]
    : [];

  return {
    cnpj: formatCnpj(record.cnpj ?? ''),
    razao_social: record.razao_social ?? '',
    nome_fantasia: record.nome_fantasia || record.razao_social || '',
    situacao_cadastral: normalizeSituacao(record.situacao_cadastral),
    data_abertura: normalizeDate(record.data_abertura),
    porte: normalizePorte(record.porte),
    endereco_principal: endereco,
    cnae_principal: {
      codigo: record.cnae_principal_codigo ?? '',
      descricao: record.cnae_principal_descricao ?? '',
    },
    quadro_socios: socios,
    telefones: ensureArray<string>(record.telefones),
    emails: ensureArray<string>(record.emails).map((email: string) => email.toLowerCase()),
    documentos: [],
  };
};

export const mapTaskRecordToResponse = (task: any): TaskResponse => {
  const relatedDealName = task.related_deal_name
    || task.deals?.company_name
    || task.deals?.name
    || task.deals?.title
    || 'N/A';

  return {
    id: task.id,
    title: task.title ?? '',
    dueDate: normalizeDate(task.due_date),
    priority: task.priority ?? 'Média',
    status: task.status ?? 'A Fazer',
    description: task.description ?? null,
    googleCalendarEventId: task.google_calendar_event_id ?? null,
    relatedDealId: task.deal_id ?? '',
    relatedDealName,
    createdAt: task.created_at ?? new Date().toISOString(),
  };
};

const formatLastLogin = (value?: string | null): string => {
  if (!value) {
    return 'Nunca';
  }
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Nunca';
    }
    return parsed.toLocaleDateString('pt-BR');
  } catch {
    return 'Nunca';
  }
};

export const mapProfileToTeamMember = (profile: any): TeamMemberResponse => ({
  id: profile.id,
  name: profile.name ?? '',
  email: profile.email ?? '',
  role: profile.role ?? 'User',
  status: profile.status ?? 'Ativo',
  lastLogin: formatLastLogin(profile.last_login),
  emailUsageGB: profile.email_usage_gb ? Number(profile.email_usage_gb) : 0,
});

export const handleSupabaseError = <T>(result: PostgrestSingleResponse<T>) => {
  if (result.error) {
    throw result.error;
  }
  return result;
};
