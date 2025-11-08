

import React from 'react';
import {
  StatCardData,
  SalesData,
  DealStageData,
  RecentActivity,
  ChurnPrediction,
  UpsellOpportunity,
  AutomatedReport,
  ConsentStatus,
  DataAccessLog,
  ProgramaIndicacoesStatus,
  Indicacao,
  EmpresaParaIndicar,
  Deal,
  Task,
  TaskStatus,
  DealStage,
  Empresa,
  RedeDeVinculos,
  TeamMember,
// FIX: Added file extension to import path
} from '../types.ts';
import {
    DollarSignIcon,
    TrendingUpIcon,
    UsersIcon,
    BriefcaseIcon
// FIX: Added file extension to import path
} from '../components/icons/Icons.tsx';

// Mock Data for Dashboard
// FIX: Replaced JSX with React.createElement to be valid in a .ts file as it cannot parse JSX syntax.
export const mockStatCardsData: StatCardData[] = [
  {
    title: 'Receita Total',
    value: 'R$ 75.8k',
    change: '+12.5%',
    changeType: 'increase',
    icon: React.createElement(DollarSignIcon, { className: "w-6 h-6 text-gray-400" }),
  },
  {
    title: 'Novos Negócios',
    value: '32',
    change: '+8.2%',
    changeType: 'increase',
    icon: React.createElement(BriefcaseIcon, { className: "w-6 h-6 text-gray-400" }),
  },
  {
    title: 'Taxa de Conversão',
    value: '24.7%',
    change: '-1.2%',
    changeType: 'decrease',
    icon: React.createElement(TrendingUpIcon, { className: "w-6 h-6 text-gray-400" }),
  },
  {
    title: 'Clientes Ativos',
    value: '189',
    change: '+3',
    changeType: 'increase',
    icon: React.createElement(UsersIcon, { className: "w-6 h-6 text-gray-400" }),
  },
];

export const mockSalesChartData: SalesData[] = [
  { name: 'Jan', sales: 30, revenue: 2400 },
  { name: 'Feb', sales: 42, revenue: 3800 },
  { name: 'Mar', sales: 51, revenue: 4300 },
  { name: 'Apr', sales: 60, revenue: 5100 },
  { name: 'May', sales: 55, revenue: 4900 },
  { name: 'Jun', sales: 68, revenue: 6200 },
];

export const mockDealStageData: DealStageData[] = [
  { name: 'Prospecting', value: 45, color: '#3b82f6' },
  { name: 'Qualification', value: 25, color: '#8b5cf6' },
  { name: 'Proposal', value: 15, color: '#ec4899' },
  { name: 'Negotiation', value: 8, color: '#f97316' },
];

export const mockRecentActivities: RecentActivity[] = [
  {
    id: '1',
    user: { name: 'Ana Costa', avatar: 'https://ui-avatars.com/api/?name=Ana+Costa&background=random' },
    action: 'moveu o negócio',
    target: 'Tech Solutions Inc.',
    timestamp: '2 horas atrás',
  },
  {
    id: '2',
    user: { name: 'Bruno Lima', avatar: 'https://ui-avatars.com/api/?name=Bruno+Lima&background=random' },
    action: 'adicionou uma nova tarefa para',
    target: 'Mercado Central',
    timestamp: '5 horas atrás',
  },
  {
    id: '3',
    user: { name: 'Carla Dias', avatar: 'https://ui-avatars.com/api/?name=Carla+Dias&background=random' },
    action: 'ganhou o negócio',
    target: 'Inova Web',
    timestamp: '1 dia atrás',
  },
];


// Mock Data for Prospeccao CNPJs
export const mockProspectsCnpjs: string[] = [
    '03.889.924/0001-38', '11.222.333/0001-44', '44.555.666/0001-77',
    '33.623.551/0001-93', '01.851.711/0001-40', '08.082.215/0001-71',
    '23.890.962/0001-28', '26.804.855/0001-20', '32.972.898/0001-76',
    '10.789.745/0001-05', '05.432.123/0001-99', '15.678.901/0001-12',
    '20.123.456/0001-34', '30.987.654/0001-56'
];

// NEW: Detailed mock data for each prospect CNPJ to fix API errors
// FIX: Added 'as const' to string literal union types to satisfy TypeScript.
export let mockEmpresas: Empresa[] = [
    {
        cnpj: "03.889.924/0001-38",
        razao_social: "PANIFICADORA E CONFEITARIA ALPHA VILLE LTDA",
        nome_fantasia: "ALPHA VILLE",
        situacao_cadastral: "Ativa" as const,
        data_abertura: "2000-06-15",
        porte: "ME" as const,
        endereco_principal: { logradouro: "AV YPIRANGA", numero: "200", bairro: "REPUBLICA", cidade: "SAO PAULO", uf: "SP", cep: "01046-925" },
        cnae_principal: { codigo: "4721-1/02", descricao: "Padaria e confeitaria com predominância de revenda" },
        quadro_socios: [{ nome_socio: "MARIA DA SILVA", cpf_parcial: "***.111.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: ["1123456789"], emails: ["contato@alphavillepan.com.br"], documentos: []
    },
    {
        cnpj: "11.222.333/0001-44",
        razao_social: "SOLUCOES TECH LTDA",
        nome_fantasia: "TECH SOLUTIONS",
        situacao_cadastral: "Ativa" as const,
        data_abertura: "2009-10-20",
        porte: "EPP" as const,
        endereco_principal: { logradouro: "RUA VERGUEIRO", numero: "1353", bairro: "PARAISO", cidade: "SAO PAULO", uf: "SP", cep: "04101-000" },
        cnae_principal: { codigo: "6201-5/01", descricao: "Desenvolvimento de programas de computador sob encomenda" },
        quadro_socios: [{ nome_socio: "JOAO ALBERTO DA SILVA", cpf_parcial: "***.222.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 50 }, { nome_socio: "CARLOS PEREIRA", cpf_parcial: "***.333.***-**", qualificacao: "Sócio", percentual_capital: 50 }],
        telefones: ["11987654321"], emails: ["ceo@techsolutions.com"], documentos: []
    },
    {
        cnpj: "44.555.666/0001-77",
        razao_social: "AGROPECUARIA CAMPOS VERDES LTDA",
        nome_fantasia: "CAMPOS VERDES",
        situacao_cadastral: "Ativa" as const,
        data_abertura: "2021-12-01",
        porte: "Demais" as const,
        endereco_principal: { logradouro: "AV BRIGADEIRO FARIA LIMA", numero: "4509", bairro: "ITAIM BIBI", cidade: "SAO PAULO", uf: "SP", cep: "04538-133" },
        cnae_principal: { codigo: "0151-2/01", descricao: "Criação de bovinos para corte" },
        quadro_socios: [{ nome_socio: "PEDRO OLIVEIRA", cpf_parcial: "***.444.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: ["1133334444"], emails: ["diretoria@camposverdes.com"], documentos: []
    },
    {
        cnpj: "33.623.551/0001-93",
        razao_social: "TRANSPORTADORA VELOZ LTDA",
        nome_fantasia: "LOGISTICA VELOZ",
        situacao_cadastral: "Suspensa" as const,
        data_abertura: "2019-05-10",
        porte: "Demais" as const,
        endereco_principal: { logradouro: "RUA BELA CINTRA", numero: "77", bairro: "CONSOLACAO", cidade: "SAO PAULO", uf: "SP", cep: "01415-000" },
        cnae_principal: { codigo: "4930-2/02", descricao: "Transporte rodoviário de carga" },
        quadro_socios: [{ nome_socio: "DANIEL ALVES", cpf_parcial: "***.555.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: [], emails: [], documentos: []
    },
    {
        cnpj: "01.851.711/0001-40",
        razao_social: "INOVA WEB DESENVOLVIMENTO LTDA",
        nome_fantasia: "INOVA WEB",
        situacao_cadastral: "Ativa" as const,
        data_abertura: "1997-05-23",
        porte: "ME" as const,
        endereco_principal: { logradouro: "ALAMEDA SANTOS", numero: "211", bairro: "CERQUEIRA CESAR", cidade: "SAO PAULO", uf: "SP", cep: "01419-000" },
        cnae_principal: { codigo: "6203-1/00", descricao: "Desenvolvimento e licenciamento de programas de computador" },
        quadro_socios: [{ nome_socio: "BRUNO LIMA", cpf_parcial: "***.666.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: ["1155556666"], emails: ["contato@inovaweb.com"], documentos: []
    },
    {
        cnpj: "08.082.215/0001-71",
        razao_social: "MERCADO CENTRAL LTDA",
        nome_fantasia: "MERCADO CENTRAL",
        situacao_cadastral: "Baixada" as const,
        data_abertura: "2006-05-30",
        porte: "EPP" as const,
        endereco_principal: { logradouro: "RUA DA CANTAREIRA", numero: "306", bairro: "CENTRO", cidade: "SAO PAULO", uf: "SP", cep: "01024-000" },
        cnae_principal: { codigo: "4711-3/02", descricao: "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados" },
        quadro_socios: [{ nome_socio: "CARLA DIAS", cpf_parcial: "***.777.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: [], emails: [], documentos: []
    },
    {
        cnpj: "23.890.962/0001-28",
        razao_social: "CONSTRUCOES SEGURAS S.A.",
        nome_fantasia: "CONSTRUCOES SEGURAS SA",
        situacao_cadastral: "Ativa" as const,
        data_abertura: "2015-12-18",
        porte: "Demais" as const,
        endereco_principal: { logradouro: "AV PAULISTA", numero: "1000", bairro: "BELA VISTA", cidade: "SAO PAULO", uf: "SP", cep: "01310-100" },
        cnae_principal: { codigo: "4120-4/00", descricao: "Construção de edifícios" },
        quadro_socios: [{ nome_socio: "EDUARDA FERREIRA", cpf_parcial: "***.888.***-**", qualificacao: "Diretor", percentual_capital: 0 }, { nome_socio: "FABIO SOUZA", cpf_parcial: "***.999.***-**", qualificacao: "Diretor", percentual_capital: 0 }],
        telefones: ["1144445555"], emails: ["contato@construseg.com"], documentos: []
    },
    {
        cnpj: "10.789.745/0001-05",
        razao_social: "SAUDE & BEM-ESTAR CLINICA MEDICA LTDA",
        nome_fantasia: "SAUDE & BEM-ESTAR",
        situacao_cadastral: "Ativa" as const,
        porte: "EPP" as const,
        data_abertura: "2009-04-15",
        endereco_principal: { logradouro: "RUA CUBATAO", numero: "500", bairro: "VILA MARIANA", cidade: "SAO PAULO", uf: "SP", cep: "04013-001" },
        cnae_principal: { codigo: "8630-5/03", descricao: "Atividade médica ambulatorial restrita a consultas" },
        quadro_socios: [{ nome_socio: "GABRIELA MOTA", cpf_parcial: "***.121.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: ["1150841234"], emails: ["clinica@saudebemestar.com"], documentos: []
    },
    {
        cnpj: "05.432.123/0001-99",
        razao_social: "EDUCA MAIS CURSOS E TREINAMENTOS LTDA",
        nome_fantasia: "EDUCA MAIS",
        situacao_cadastral: "Ativa" as const,
        porte: "ME" as const,
        data_abertura: "2002-11-25",
        endereco_principal: { logradouro: "RUA AUGUSTA", numero: "2500", bairro: "JARDINS", cidade: "SAO PAULO", uf: "SP", cep: "01412-100" },
        cnae_principal: { codigo: "8599-6/04", descricao: "Treinamento em desenvolvimento profissional e gerencial" },
        quadro_socios: [{ nome_socio: "HEITOR BARROS", cpf_parcial: "***.131.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 70 }, { nome_socio: "ISABELA ROCHA", cpf_parcial: "***.141.***-**", qualificacao: "Sócio", percentual_capital: 30 }],
        telefones: ["1130629876"], emails: ["contato@educamais.com"], documentos: []
    },
    {
        cnpj: "15.678.901/0001-12",
        razao_social: "CONSULTORIA ESTRATEGICA DELTA LTDA",
        nome_fantasia: "DELTA CONSULTING",
        situacao_cadastral: "Ativa" as const,
        porte: "Demais" as const,
        data_abertura: "2012-08-01",
        endereco_principal: { logradouro: "AV DAS NACOES UNIDAS", numero: "12551", bairro: "BROOKLIN", cidade: "SAO PAULO", uf: "SP", cep: "04578-903" },
        cnae_principal: { codigo: "7020-4/00", descricao: "Atividades de consultoria em gestão empresarial" },
        quadro_socios: [{ nome_socio: "LUCAS MARTINS", cpf_parcial: "***.151.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: ["1130437000"], emails: ["lucas.martins@deltaconsulting.com"], documentos: []
    },
    {
        cnpj: "20.123.456/0001-34",
        razao_social: "RESTAURANTE SABOR BRASILEIRO LTDA",
        nome_fantasia: "SABOR BRASILEIRO",
        situacao_cadastral: "Ativa" as const,
        porte: "EPP" as const,
        data_abertura: "2014-02-20",
        endereco_principal: { logradouro: "RUA DOS PINHEIROS", numero: "1234", bairro: "PINHEIROS", cidade: "SAO PAULO", uf: "SP", cep: "05422-002" },
        cnae_principal: { codigo: "5611-2/01", descricao: "Restaurantes e similares" },
        quadro_socios: [{ nome_socio: "RAFAELA LIMA", cpf_parcial: "***.161.***-**", qualificacao: "Sócio-Administrador", percentual_capital: 100 }],
        telefones: ["1130815432"], emails: ["contato@saborbrasileiro.com"], documentos: []
    },
].map(e => ({ ...e, distancia_km: undefined }));



// Mock Data for Analytics
export const mockChurnPredictions: ChurnPrediction[] = [
    { id: 'c1', companyName: 'Logística Veloz Ltda', churnRisk: 85, primaryReason: 'Baixo engajamento', suggestedAction: 'Agendar reunião de reavaliação de necessidades.' },
    { id: 'c2', companyName: 'Construções Seguras SA', churnRisk: 72, primaryReason: 'Atrasos recorrentes de pagamento', suggestedAction: 'Oferecer plano de pagamento flexível.' }
];

export const mockUpsellOpportunities: UpsellOpportunity[] = [
    { id: 'u1', companyName: 'Inova Web', opportunityType: 'Upsell', productSuggestion: 'Consultoria Fiscal Avançada', confidence: 92, potentialValue: 15000 },
    { id: 'u2', companyName: 'Agropecuária Campos Verdes', opportunityType: 'Cross-sell', productSuggestion: 'Serviço de Folha de Pagamento', confidence: 88, potentialValue: 8000 }
];

export const mockAutomatedReport: AutomatedReport = {
    title: 'Relatório Executivo Semanal',
    summary: '<h2>Resumo Geral</h2><p>A semana apresentou um crescimento robusto de <strong>8.2%</strong> em novos negócios, impulsionando a receita. No entanto, a saúde do funil requer atenção no estágio de Proposta, que está abaixo da média.</p><h2>Alertas e Oportunidades</h2><ul><li><strong>Risco de Churn:</strong> A empresa "Logística Veloz Ltda" apresenta <strong>85%</strong> de risco de churn. Ação imediata recomendada.</li><li><strong>Oportunidade de Upsell:</strong> "Inova Web" tem <strong>92%</strong> de chance de aceitar um upsell para Consultoria Fiscal, com potencial de R$15.000.</li></ul>',
    generatedAt: new Date().toISOString(),
};

// Mock data for Compliance
export const mockConsentStatus: ConsentStatus = {
    totalUsers: 250,
    consentedUsers: 215,
    consentText: '✅ Uso de dados para análise de performance.\n✅ Comunicação sobre novos serviços.\n❌ Compartilhamento com parceiros terceiros.',
};
export const mockDataAccessLogs: DataAccessLog[] = [
    { id: 'l1', user: 'Sergio Leao', action: 'exported', target: 'Relatório de Vendas Q2', timestamp: '2024-07-21 10:05:12' },
    { id: 'l2', user: 'Ana Costa', action: 'viewed', target: 'Detalhes de Contato - Tech Solutions', timestamp: '2024-07-21 09:33:45' },
    { id: 'l3', user: 'Sistema IA', action: 'viewed', target: 'Dados Agregados de Vendas', timestamp: '2024-07-21 08:00:00' },
    { id: 'l4', user: 'Bruno Lima', action: 'viewed', target: 'Lista de Prospects', timestamp: '2024-07-20 20:15:30' },
];

// Mock data for ReportGeneration
export const mockNetworkData: RedeDeVinculos[] = [
  { socio_nome: 'JOAO ALBERTO DA SILVA', vinculos: [ { empresa_vinculada_cnpj: '11.222.333/0001-44', empresa_vinculada_nome: 'Soluções Tech Ltda', grau_vinculo: 1, tipo_vinculo: 'direto' } ] },
];
// FIX: Added 'as const' to string literal union types to satisfy TypeScript.
export const mockTerritorialData: Empresa[] = [
    { cidade: 'São Paulo', porte: 'EPP' as const }, { cidade: 'São Paulo', porte: 'ME' as const }, { cidade: 'Barueri', porte: 'Demais' as const }
].map(d => ({ ...d, cnpj: '', razao_social: '', nome_fantasia: '', situacao_cadastral: 'Ativa', data_abertura: '', endereco_principal: { logradouro: '', numero: '', bairro: '', cidade: d.cidade, uf: 'SP', cep: ''}, quadro_socios: [], cnae_principal: { codigo: '', descricao: '' }, telefones: [], emails: [], documentos: [] }));
export const mockPerformanceData = {
    status: { nivel: 'Ouro' as const, total_ganho: 12500, indicacoes_convertidas: 8, meta_proximo_nivel: 12, beneficio_atual: 'Recompensa 15% maior' },
    indicacoes: [{id: 'i1', empresa_nome: 'Tech Solutions Inc.', status: 'Convertido' as const, data_indicacao: '2024-05-10', recompensa_ganha: 2500 }]
};


// Mock Data for Indicacoes
export const mockIndicacoesStatus: ProgramaIndicacoesStatus = {
  nivel: 'Ouro',
  total_ganho: 12500,
  indicacoes_convertidas: 8,
  meta_proximo_nivel: 12,
  beneficio_atual: 'Recompensa 15% maior em todas as indicações.',
};

export const mockMinhasIndicacoes: Indicacao[] = [
  { id: 'ind1', empresa_nome: 'Tech Solutions Inc.', status: 'Convertido', data_indicacao: '2024-05-10', recompensa_ganha: 2500 },
  { id: 'ind2', empresa_nome: 'Inova Web', status: 'Em negociação', data_indicacao: '2024-06-22' },
  { id: 'ind3', empresa_nome: 'Mercado Central', status: 'Rejeitado', data_indicacao: '2024-07-01' },
];

export const mockEmpresasParaIndicar: EmpresaParaIndicar[] = [
    { cnpj: '01.234.567/0001-89', razao_social: 'Padaria Pão Quente Ltda', nome_fantasia: 'Pão Quente', situacao_cadastral: 'Ativa', data_abertura: '2010-01-15', porte: 'ME', endereco_principal: { logradouro: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01001-000'}, cnae_principal: { codigo: '1091-1/02', descricao: 'Panificação'}, telefones: [], emails: [], distancia_km: 1.2, recompensa: 800 },
    { cnpj: '98.765.432/0001-10', razao_social: 'Oficina Mecânica Veloz EIRELI', nome_fantasia: 'Auto Rápido', situacao_cadastral: 'Ativa', data_abertura: '2015-08-20', porte: 'EPP', endereco_principal: { logradouro: 'Avenida Principal', numero: '456', bairro: 'Vila Mariana', cidade: 'São Paulo', uf: 'SP', cep: '04001-000'}, cnae_principal: { codigo: '4520-0/01', descricao: 'Serviços de mecânica'}, telefones: [], emails: [], distancia_km: 3.5, recompensa: 1200 },
];


// Mock Data for Negocios
const baseDeals: Omit<Deal, 'id' | 'stage'>[] = [
    { companyName: 'TECH SOLUTIONS', contactName: 'Ana Costa', contactEmail: 'ana.costa@techsolutions.com', value: 50000, probability: 60, expectedCloseDate: '2024-08-15', lastActivity: '2024-07-20', health: null },
    { companyName: 'INOVA WEB', contactName: 'Bruno Lima', contactEmail: 'bruno.lima@inovaweb.com', value: 75000, probability: 95, expectedCloseDate: '2024-07-30', lastActivity: '2024-07-21', health: null },
    { companyName: 'MERCADO CENTRAL', contactName: 'Carla Dias', contactEmail: 'carla.dias@mercadocentral.com', value: 25000, probability: 30, expectedCloseDate: '2024-09-01', lastActivity: '2024-07-18', health: null },
    { companyName: 'LOGISTICA VELOZ', contactName: 'Daniel Alves', contactEmail: 'daniel.alves@logisticaveloz.com', value: 120000, probability: 70, expectedCloseDate: '2024-08-20', lastActivity: '2024-07-19', health: null },
    { companyName: 'CONSTRUCOES SEGURAS SA', contactName: 'Eduarda Ferreira', contactEmail: 'eduarda.f@construseg.com', value: 250000, probability: 50, expectedCloseDate: '2024-09-10', lastActivity: '2024-07-21', health: null },
    { companyName: 'CAMPOS VERDES', contactName: 'Fábio Souza', contactEmail: 'fabio.souza@agrocampos.com', value: 95000, probability: 20, expectedCloseDate: '2024-08-25', lastActivity: '2024-07-15', health: null },
    { companyName: 'SAUDE & BEM-ESTAR', contactName: 'Gabriela Mota', contactEmail: 'gabi.mota@saudeebemestar.com', value: 45000, probability: 10, expectedCloseDate: '2024-10-01', lastActivity: '2024-06-30', health: null },
    { companyName: 'EDUCA MAIS', contactName: 'Heitor Barros', contactEmail: 'heitor@educamais.com', value: 60000, probability: 0, expectedCloseDate: '2024-07-15', lastActivity: '2024-07-10', health: null },
    { companyName: 'DELTA CONSULTING', contactName: 'Lucas Martins', contactEmail: 'lucas.martins@deltaconsulting.com', value: 180000, probability: 80, expectedCloseDate: '2024-08-05', lastActivity: '2024-07-22', health: null },
    { companyName: 'SABOR BRASILEIRO', contactName: 'Rafaela Lima', contactEmail: 'rafaela@saborbrasileiro.com', value: 40000, probability: 40, expectedCloseDate: '2024-09-20', lastActivity: '2024-07-17', health: null },
];

const assignStage = (index: number): DealStage => {
    if (index === 1) return 'Closed Won';
    if (index === 7) return 'Closed Lost';
    const stages: DealStage[] = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];
    return stages[index % stages.length];
};

export let mockDeals: Deal[] = baseDeals.map((deal, index) => ({
    ...deal,
    id: `deal-${index + 1}`,
    stage: assignStage(index),
    health: null,
}));


// Mock Data for Tarefas
export let mockTasks: Task[] = [
    { id: 't1', title: 'Enviar proposta para TECH SOLUTIONS', dueDate: '2024-07-25', priority: 'Alta', status: 'Em Andamento', relatedDealId: 'deal-1', relatedDealName: 'TECH SOLUTIONS', createdAt: '2024-07-20' },
    { id: 't2', title: 'Follow-up com MERCADO CENTRAL', dueDate: '2024-07-28', priority: 'Média', status: 'A Fazer', relatedDealId: 'deal-3', relatedDealName: 'MERCADO CENTRAL', createdAt: '2024-07-21' },
    { id: 't3', title: 'Agendar reunião com LOGISTICA VELOZ', dueDate: '2024-07-23', priority: 'Alta', status: 'A Fazer', relatedDealId: 'deal-4', relatedDealName: 'LOGISTICA VELOZ', createdAt: '2024-07-21' },
    { id: 't4', title: 'Preparar documentação para INOVA WEB', dueDate: '2024-07-22', priority: 'Média', status: 'Concluída', relatedDealId: 'deal-2', relatedDealName: 'INOVA WEB', createdAt: '2024-07-19' },
    { id: 't5', title: 'Analisar balanço da DELTA CONSULTING', dueDate: '2024-07-29', priority: 'Alta', status: 'A Fazer', relatedDealId: 'deal-9', relatedDealName: 'DELTA CONSULTING', createdAt: '2024-07-22' },
    { id: 't6', title: 'Ligar para SABOR BRASILEIRO', dueDate: '2024-07-26', priority: 'Baixa', status: 'A Fazer', relatedDealId: 'deal-10', relatedDealName: 'SABOR BRASILEIRO', createdAt: '2024-07-22' },
];

// Mock Data for Equipe
export let mockTeamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Admin ampla', email: 'financeiro@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 1 dia', emailUsageGB: 0.48 },
    { id: 'user-2', name: 'Ampla Contabilidade', email: 'ampla@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 11 meses', emailUsageGB: 0.36 },
    { id: 'user-3', name: 'Contabil amplabusiness.com.br', email: 'contabil@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 1 semana', emailUsageGB: 5.05 },
    { id: 'user-4', name: 'fiscal Amplabusiness', email: 'fiscal@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 2 dias', emailUsageGB: 12.68 },
    { id: 'user-5', name: 'legalizacao amplabusiness', email: 'legalizacao@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 1 dia', emailUsageGB: 20.97 },
    { id: 'user-6', name: 'nayara leão', email: 'nayara@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 2 dias', emailUsageGB: 2.94 },
    { id: 'user-7', name: 'RH rh', email: 'rh@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 1 dia', emailUsageGB: 22.77 },
    { id: 'user-8', name: 'sergio carneiro leao', email: 'sergio@amplabusiness.com.br', role: 'Admin', status: 'Ativo', lastLogin: 'Há 1 dia', emailUsageGB: 8.14 },
    { id: 'user-9', name: 'Victor Leão', email: 'victor@amplabusiness.com.br', role: 'User', status: 'Ativo', lastLogin: 'Há 1 dia', emailUsageGB: 0.42 },
];