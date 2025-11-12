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

export interface DealHealthResponse {
  score: number;
  reasoning: string;
  suggestedAction: string;
}

export interface DealResponse {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  value: number;
  probability: number;
  expectedCloseDate: string | null;
  lastActivity: string | null;
  stage: string;
  health: DealHealthResponse | null;
  empresaCnpj: string | null;
  ownerId: string | null;
  createdAt: string | null;
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

function sanitizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type OptionalString = string | null | undefined;

interface SocioData {
  nome_socio?: OptionalString;
  cpf_parcial?: OptionalString;
  data_nascimento?: OptionalString;
  cpf_completo?: OptionalString;
}

interface SocioEntry {
  socio?: SocioData | SocioData[] | null;
  socios?: SocioData | SocioData[] | null;
  qualificacao?: OptionalString;
  percentual_capital?: number | string | null;
}

interface EmpresaRecordInput {
  cnpj: string;
  razao_social?: OptionalString;
  nome_fantasia?: OptionalString;
  situacao_cadastral?: OptionalString;
  data_abertura?: OptionalString;
  porte?: OptionalString;
  logradouro?: OptionalString;
  numero?: OptionalString;
  bairro?: OptionalString;
  cidade?: OptionalString;
  uf?: OptionalString;
  cep?: OptionalString;
  latitude?: number | string | null;
  longitude?: number | string | null;
  cnae_principal_codigo?: OptionalString;
  cnae_principal_descricao?: OptionalString;
  telefones?: string[] | string | null;
  emails?: string[] | string | null;
  documentos?: unknown[] | null;
  empresa_socios?: SocioEntry[] | null;
}

interface DealRecordInput {
  id: string;
  company_name?: OptionalString;
  companyName?: OptionalString;
  contact_name?: OptionalString;
  contactName?: OptionalString;
  contact_email?: OptionalString;
  contactEmail?: OptionalString;
  value?: number | string | null;
  probability?: number | string | null;
  expected_close_date?: OptionalString;
  expectedCloseDate?: OptionalString;
  last_activity?: OptionalString;
  lastActivity?: OptionalString;
  stage?: OptionalString;
  health_score?: number | string | null;
  healthScore?: number | string | null;
  health_reasoning?: OptionalString;
  healthReasoning?: OptionalString;
  health_suggested_action?: OptionalString;
  healthSuggestedAction?: OptionalString;
  empresa_cnpj?: OptionalString;
  empresaCnpj?: OptionalString;
  owner_id?: OptionalString;
  ownerId?: OptionalString;
  created_at?: OptionalString;
  createdAt?: OptionalString;
  [key: string]: unknown;
}

interface TaskDealRelation {
  company_name?: OptionalString;
  name?: OptionalString;
  title?: OptionalString;
}

interface TaskRecordInput {
  id: string;
  title?: OptionalString;
  due_date?: OptionalString;
  priority?: OptionalString;
  status?: OptionalString;
  description?: OptionalString;
  google_calendar_event_id?: OptionalString;
  deal_id?: OptionalString;
  related_deal_name?: OptionalString;
  deals?: TaskDealRelation | null;
  created_at?: OptionalString;
}

interface ProfileRecordInput {
  id: string;
  name?: OptionalString;
  email?: OptionalString;
  role?: OptionalString;
  status?: OptionalString;
  last_login?: OptionalString;
  email_usage_gb?: number | string | null;
}

const extractSocioData = (value: SocioEntry | null | undefined): SocioData | null => {
  if (!value) {
    return null;
  }

  const candidate = value.socio ?? value.socios ?? null;
  if (!candidate) {
    return null;
  }

  return Array.isArray(candidate) ? candidate[0] ?? null : candidate;
};

export const mapEmpresaRecordToResponse = (record: EmpresaRecordInput): EmpresaResponse => {
  const endereco: EnderecoResponse = {
    logradouro: record.logradouro ?? '',
    numero: record.numero ?? '',
    bairro: record.bairro ?? '',
    cidade: record.cidade ?? '',
    uf: record.uf ?? '',
    cep: record.cep ?? '',
    latitude: sanitizeNumber(record.latitude) ?? undefined,
    longitude: sanitizeNumber(record.longitude) ?? undefined,
  };
  const socios: SocioResponse[] = Array.isArray(record.empresa_socios)
    ? record.empresa_socios
        .map((entry) => {
          const socio = extractSocioData(entry);
          const nome = socio?.nome_socio ?? '';
          if (!nome) {
            return null;
          }

          const percentual = Number(entry.percentual_capital ?? 0);

          return {
            nome_socio: nome,
            cpf_parcial: sanitizeCnpj(socio?.cpf_parcial ?? ''),
            qualificacao: entry.qualificacao ?? 'Sócio',
            percentual_capital: Number.isFinite(percentual) ? percentual : 0,
          } satisfies SocioResponse;
        })
        .filter((socio): socio is SocioResponse => socio !== null)
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
    emails: ensureArray<string>(record.emails).map((email) => email.toLowerCase()),
    documentos: [],
  };
};

export const mapDealRecordToResponse = (deal: DealRecordInput): DealResponse => {
  const parsedValue = typeof deal.value === 'number' ? deal.value : Number(deal.value ?? 0);
  const parsedProbability =
    typeof deal.probability === 'number' ? deal.probability : Number(deal.probability ?? 0);

  const parsedHealthScore = Number(
    deal.health_score ?? deal.healthScore ?? Number.NaN,
  );
  const hasHealth = Number.isFinite(parsedHealthScore);

  return {
    id: deal.id,
    companyName: deal.company_name ?? deal.companyName ?? '',
    contactName: deal.contact_name ?? deal.contactName ?? '',
    contactEmail: deal.contact_email ?? deal.contactEmail ?? '',
    value: Number.isFinite(parsedValue) ? parsedValue : 0,
    probability: Number.isFinite(parsedProbability) ? parsedProbability : 0,
    expectedCloseDate: deal.expected_close_date ?? deal.expectedCloseDate ?? null,
    lastActivity: deal.last_activity ?? deal.lastActivity ?? null,
    stage: deal.stage ?? 'Prospecting',
    health: hasHealth
      ? {
          score: parsedHealthScore,
          reasoning: deal.health_reasoning ?? deal.healthReasoning ?? '',
          suggestedAction:
            deal.health_suggested_action ?? deal.healthSuggestedAction ?? '',
        }
      : null,
    empresaCnpj: deal.empresa_cnpj ?? deal.empresaCnpj ?? null,
    ownerId: deal.owner_id ?? deal.ownerId ?? null,
    createdAt: deal.created_at ?? deal.createdAt ?? null,
  };
};

export const mapTaskRecordToResponse = (task: TaskRecordInput): TaskResponse => {
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

const resolveRole = (value: OptionalString): TeamMemberResponse['role'] =>
  value === 'Admin' ? 'Admin' : 'User';

const resolveStatus = (value: OptionalString): TeamMemberResponse['status'] =>
  value === 'Inativo' ? 'Inativo' : 'Ativo';

export const mapProfileToTeamMember = (profile: ProfileRecordInput): TeamMemberResponse => ({
  id: profile.id,
  name: profile.name ?? '',
  email: profile.email ?? '',
  role: resolveRole(profile.role),
  status: resolveStatus(profile.status),
  lastLogin: formatLastLogin(profile.last_login),
  emailUsageGB: sanitizeNumber(profile.email_usage_gb) ?? 0,
});

export const handleSupabaseError = <T>(result: PostgrestSingleResponse<T>) => {
  if (result.error) {
    throw result.error;
  }
  return result;
};
