import React from 'react';

export interface StatCardData {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon?: React.ReactElement;
}

export interface SalesData {
  name: string;
  sales: number;
  revenue: number;
}

export interface DealStageData {
  name: string;
  value: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  action: string;
  target: string;
  timestamp: string;
}

export interface Endereco {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    latitude?: number;
    longitude?: number;
}

export interface CNAE {
    codigo: string;
    descricao: string;
}

export interface Socio {
    nome_socio: string;
    cpf_parcial: string;
    qualificacao: string;
    percentual_capital: number;
    data_nascimento?: string | null;
    cpf_completo?: string | null;
}

/**
 * Business logic interface for Empresa
 * Note: This uses nested objects (endereco_principal, cnae_principal, quadro_socios)
 * The database uses individual fields - see types-db.ts for EmpresaDB
 * Use mappers.ts to transform between database and business types
 */
export interface Empresa {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    situacao_cadastral: 'Ativa' | 'Suspensa' | 'Baixada';
    data_abertura: string;
    porte: 'ME' | 'EPP' | 'Demais';
    endereco_principal: Endereco;
    cnae_principal: CNAE;
    quadro_socios: Socio[];
    telefones: string[];
    emails: string[];
  documentos: unknown[];
    distancia_km?: number;
    createdAt?: string;  // Timestamp from empresas table
}

export type View =
  | 'Dashboard'
  | 'Prospecção'
  | 'Negócios'
  | 'Tarefas'
  | 'Análises'
  | 'Análise de Cliente'
  | 'Indicações'
  | 'Compliance'
  | 'Pesquisa de Mercado'
  | 'Editor de Imagens'
  | 'Vínculos'
  | 'Empresa Detalhe'
  | 'Equipe & Comunicação'
  | 'Admin';

export type NavigateFn = (view: View, payload?: Empresa) => void;

export type DealStage = 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

export interface Deal {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  value: number;
  probability: number;
  expectedCloseDate: string | null;
  lastActivity: string | null;
  stage: DealStage;
  health: DealHealth | null;
  empresaCnpj?: string | null;  // Foreign key to empresas table
  ownerId?: string | null;       // Foreign key to profiles table
  createdAt?: string | null;
}

export type TaskStatus = 'A Fazer' | 'Em Andamento' | 'Concluída';

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: 'Alta' | 'Média' | 'Baixa';
  status: TaskStatus;
  relatedDealId: string;
  relatedDealName: string;
  createdAt: string;
  description?: string;
  googleCalendarEventId?: string;
  assigneeId?: string | null;  // Foreign key to profiles table
}

export type UserRole = 'Admin' | 'User';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Ativo' | 'Inativo';
  lastLogin: string;
  emailUsageGB: number;
  createdAt?: string;  // Timestamp from profiles table
}

export interface ChurnPrediction {
  id: string;
  companyName: string;
  churnRisk: number;
  primaryReason: string;
  suggestedAction: string;
}

export interface UpsellOpportunity {
  id: string;
  companyName: string;
  opportunityType: 'Upsell' | 'Cross-sell';
  productSuggestion: string;
  confidence: number;
  potentialValue: number;
}

export interface AutomatedReport {
  title: string;
  summary: string;
  generatedAt: string;
}

export interface ConsentStatus {
  totalUsers: number;
  consentedUsers: number;
  consentText: string;
}

export interface DataAccessLog {
  id: string;
  user: string;
  action: 'viewed' | 'exported' | 'modified';
  target: string;
  timestamp: string;
}

export interface ProgramaIndicacoesStatus {
    nivel: 'Bronze' | 'Prata' | 'Ouro' | 'Platina';
    total_ganho: number;
    indicacoes_convertidas: number;
    meta_proximo_nivel: number;
    beneficio_atual: string;
}

export interface Indicacao {
    id: string;
    empresa_nome: string;
    status: 'Convertido' | 'Em negociação' | 'Rejeitado';
    data_indicacao: string;
    recompensa_ganha?: number;
    indicadorId?: string | null;   // Foreign key to profiles table
    empresaCnpj?: string | null;   // Foreign key to empresas table
}

export interface ReportIndicacao {
  id: string;
  empresa_nome: string | null;
  status: string | null;
  data_indicacao: string | null;
  recompensa_ganha: number;
}

export interface EmpresaParaIndicar extends Omit<Empresa, 'quadro_socios' | 'documentos'> {
    distancia_km: number;
    recompensa: number;
}

export interface Vinculo {
    empresa_vinculada_cnpj: string;
    empresa_vinculada_nome: string;
    grau_vinculo: number;
    tipo_vinculo: 'direto' | 'indireto_socio' | 'indireto_parente';
}

export interface RedeDeVinculos {
    socio_nome: string;
    vinculos: Vinculo[];
}

export interface ParentePotencial {
    cpf_parcial_relacionado: string;
    nome_relacionado: string;
    tipo_descoberta: string;
    confiabilidade: number;
}

export interface GenealogiaSocio {
    socio_principal_cpf: string;
    parentes: ParentePotencial[];
}

export interface MarketInsightResult {
  text: string;
  sources: { uri: string; title?: string }[];
}

export interface ProspectAnalysis {
    potentialScore: number;
    justification: string;
    suggestedPitch: string;
}

export interface VinculoAnalysis {
    pitch: string;
    reasoning: string;
}

export interface DealHealth {
    score: number;
    reasoning: string;
    suggestedAction: string;
}

export interface ContratoPublico {
    id: string;
    orgao: string;
    valor: number;
    objeto: string;
    data_assinatura: string;
    url: string;
}

export interface SancaoPublica {
    id: string;
    orgao: string;
    motivo: string;
    data_publicacao: string;
    url: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
}

export interface TranscriptionPart {
    text: string;
    type: 'input' | 'output' | 'interim';
    timestamp: number;
}

export interface EmailActivity {
  id: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  relatedDealName: string;
  teamMemberName: string;
}

export interface GoogleCalendarEvent {
    summary: string;
    description: string;
    start: { date: string };
    end: { date: string };
}

export interface CompanyActivity {
    id: string;
    type: 'task' | 'deal';
    title: string;
    description: string;
    date: string;
    status: string;
}

export interface GenealogyNode {
    id: string;
    name: string;
    type: 'empresa' | 'socio';
    details: string;
    level: number;
    children: GenealogyNode[];
}

export type ReportType = 'network' | 'territorial' | 'performance';

export interface GlobalSearchResultItem {
    id: string;
    type: 'client' | 'deal' | 'task';
    title: string;
    description: string;
    payload: Empresa | Deal | Task;
}

export interface GlobalSearchResults {
    clients: GlobalSearchResultItem[];
    deals: GlobalSearchResultItem[];
    tasks: GlobalSearchResultItem[];
}

export type EmpresaDashboardModule = 'metrics' | 'pipeline' | 'tasks' | 'genealogy' | 'geo' | 'legal';

export interface EmpresaDashboardRequestOptions {
  include?: EmpresaDashboardModule[];
  refresh?: boolean;
  signal?: AbortSignal;
}

export interface EmpresaDashboardWarning {
  module: EmpresaDashboardModule | 'empresa';
  message: string;
  code?: string;
}

export interface EmpresaDashboardCompany {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: Empresa['situacao_cadastral'];
  porte: Empresa['porte'];
  cnaePrincipal: CNAE;
  endereco: Endereco;
}

export interface EmpresaDashboardMetrics {
  totalDeals: number;
  openValue: number;
  winRate: number;
  avgCycleDays: number;
  atividadeRecente: string | null;
}

export interface EmpresaDashboardPipelineDealOwner {
  id: string;
  name: string;
  email?: string | null;
}

export interface EmpresaDashboardPipelineDeal {
  id: string;
  stage: DealStage;
  value: number;
  probability: number;
  expectedCloseDate: string | null;
  owner: EmpresaDashboardPipelineDealOwner | null;
  empresaCnpj?: string | null;
  updatedAt?: string | null;
}

export interface EmpresaDashboardPipelineHistoricDeal {
  id: string;
  stage: DealStage;
  closedAt: string;
  value?: number | null;
  owner?: EmpresaDashboardPipelineDealOwner | null;
}

export interface EmpresaDashboardPipeline {
  ativos: EmpresaDashboardPipelineDeal[];
  historico: EmpresaDashboardPipelineHistoricDeal[];
}

export interface EmpresaDashboardTaskSummary {
  id: string;
  title: string;
  dueDate: string | null;
  priority: Task['priority'];
  status: TaskStatus;
  relatedDealId?: string | null;
  relatedDealName?: string | null;
  assignee?: {
    id: string;
    name?: string | null;
  } | null;
}

export interface EmpresaDashboardTasks {
  pendentes: EmpresaDashboardTaskSummary[];
  atrasadas: number;
  concluidas30d: number;
}

export interface EmpresaDashboardGenealogyNode extends GenealogyNode {
  cpfParcial?: string | null;
  grauVinculo?: number | null;
  relationshipType?: string | null;
}

export interface EmpresaDashboardGenealogy {
  nodes: EmpresaDashboardGenealogyNode[];
  generatedAt?: string | null;
}

export interface EmpresaDashboardGeoAddress {
  rotulo: string;
  lat: number;
  lng: number;
  updatedAt: string | null;
  origem?: string | null;
}

export interface EmpresaDashboardNearbyCompany {
  cnpj: string;
  nome: string;
  distanciaMetros: number;
  statusProspeccao: string;
  razaoSocial?: string | null;
  stage?: DealStage;
}

export interface EmpresaDashboardGeo {
  enderecos: EmpresaDashboardGeoAddress[];
  empresasProximas: EmpresaDashboardNearbyCompany[];
}

export interface EmpresaDashboardLegalProcess {
  id?: string;
  numero: string;
  tribunal?: string | null;
  orgaoJulgador?: string | null;
  classe?: string | null;
  assunto?: string | null;
  situacao?: string | null;
  riscoScore?: number | null;
  ultimoEvento?: {
    data: string | null;
    descricao: string | null;
  } | null;
  origem?: string | null;
  updatedAt?: string | null;
}

export interface EmpresaDashboardLegalAlert {
  tipo: 'alto_risco' | 'medio_risco' | 'baixo_risco' | 'info' | string;
  descricao: string;
  origem?: string | null;
  createdAt?: string | null;
  processoNumero?: string | null;
}

export interface EmpresaDashboardLegal {
  processos: EmpresaDashboardLegalProcess[];
  alertas: EmpresaDashboardLegalAlert[];
}

export interface EmpresaDashboardResponse {
  empresa: EmpresaDashboardCompany;
  metrics: EmpresaDashboardMetrics | null;
  pipeline: EmpresaDashboardPipeline | null;
  tasks: EmpresaDashboardTasks | null;
  genealogy: EmpresaDashboardGenealogy | null;
  geo: EmpresaDashboardGeo | null;
  legal: EmpresaDashboardLegal | null;
  warnings?: EmpresaDashboardWarning[];
  requestedModules?: EmpresaDashboardModule[];
}